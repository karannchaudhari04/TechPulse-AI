"""In-process periodic scheduler.

The Java backend ran its jobs inside the web process with Spring's
``@EnableScheduling`` / ``@Scheduled(cron=...)``. The Django port moved them to
Celery Beat, which needs a separate beat process; Render's free plan runs only a
web service, so none of the jobs ever fired.

This module restores the in-process behaviour: one daemon thread, started on the
first HTTP request, that runs the same three jobs. Celery Beat remains available
for deployments that do run a worker.

Set ``INGESTION_SCHEDULER_ENABLED=false`` to disable it (for example when Celery
Beat owns the schedule).
"""

from __future__ import annotations

import logging
import os
import tempfile
import threading
import time
from datetime import date, datetime, timedelta

from django.conf import settings

logger = logging.getLogger(__name__)

# Mirrors the Java backend: @Scheduled(cron = "0 0 */4 * * *").
INGESTION_INTERVAL = timedelta(hours=4)
# A run that reached the feeds but found nothing fresh is not a success worth
# waiting four hours for: sources publish throughout the day.
EMPTY_RUN_INTERVAL = timedelta(hours=1)
# A crash (database down, Gemini outage) should be retried quickly.
RETRY_AFTER_ERROR = timedelta(minutes=15)
TICK_SECONDS = 60
STARTUP_DELAY_SECONDS = 15

# Gunicorn runs several workers, and the cache lock is unavailable when Redis
# is not configured. A process-wide file lock elects exactly one scheduler so
# two workers cannot ingest the same article at the same time.
ELECTION_LOCK_PATH = os.getenv(
    "INGESTION_SCHEDULER_LOCK",
    os.path.join(tempfile.gettempdir(), "techpulse-scheduler.lock"),
)

_lock = threading.Lock()
_started = False
_election_fd: int | None = None


def enabled() -> bool:
    if settings.RUNNING_TESTS:
        return False
    return os.getenv("INGESTION_SCHEDULER_ENABLED", "true").lower() in {"1", "true", "yes"}


def connect() -> None:
    """Start the scheduler lazily, on the first request, never in management commands."""
    from django.core.signals import request_started

    request_started.connect(_on_request_started, dispatch_uid="core.scheduler.start")


def _on_request_started(sender, **kwargs) -> None:
    start_once()


def start_once() -> bool:
    """Start the background thread once. Returns True when this call started it."""
    global _started
    if not enabled():
        return False
    with _lock:
        if _started:
            return False
        _started = True
    thread = threading.Thread(target=_run_forever, name="techpulse-scheduler", daemon=True)
    thread.start()
    logger.info(
        "[Scheduler] In-process scheduler started (ingestion every %s)", INGESTION_INTERVAL
    )
    return True


def due_tasks(
    now: datetime,
    next_ingest_at: datetime | None,
    last_prune_date: date | None,
    last_digest_date: date | None,
) -> list[str]:
    """Return the task names that should run at ``now``."""
    due: list[str] = []
    if next_ingest_at is None or now >= next_ingest_at:
        due.append("ingestion")
    if now.hour == 0 and last_prune_date != now.date():
        due.append("pruning")
    if now.hour == 9 and last_digest_date != now.date():
        due.append("digest")
    return due


def next_run_after(now: datetime, result) -> datetime:
    """Decide when to try ingestion again, based on what the last run achieved."""
    if not isinstance(result, dict):
        return now + INGESTION_INTERVAL
    if result.get("skipped"):
        # Someone else held the lock, or ingestion is disabled.
        return now + RETRY_AFTER_ERROR
    if result.get("saved", 0) > 0:
        return now + INGESTION_INTERVAL
    return now + EMPTY_RUN_INTERVAL


def initial_next_run(now: datetime | None = None) -> datetime:
    """Catch up immediately when the newest event is already older than the interval."""
    now = now or datetime.now()
    latest = _latest_event_time()
    if latest is None:
        return now
    return latest + INGESTION_INTERVAL


def holds_election() -> bool:
    """True when this process is the one allowed to run scheduled tasks.

    ``flock`` is held for the life of the process, so a worker that exits
    releases it and another worker takes over on its next tick. On platforms
    without ``fcntl`` (Windows dev) there is a single process anyway.
    """
    global _election_fd
    if _election_fd is not None:
        return True
    try:
        import fcntl
    except ImportError:
        _election_fd = -1
        return True
    try:
        fd = os.open(ELECTION_LOCK_PATH, os.O_CREAT | os.O_RDWR, 0o644)
    except OSError as exc:
        logger.warning("[Scheduler] Cannot open %s: %s", ELECTION_LOCK_PATH, exc)
        return False
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        os.close(fd)
        return False
    _election_fd = fd
    return True


def _run_forever() -> None:
    # Let migrations, static collection, and the first requests settle.
    time.sleep(STARTUP_DELAY_SECONDS)

    last_prune_date: date | None = None
    last_digest_date: date | None = None
    next_ingest_at: datetime | None = None

    while True:
        now = datetime.now()
        try:
            if not holds_election():
                time.sleep(TICK_SECONDS)
                continue

            if next_ingest_at is None:
                next_ingest_at = initial_next_run(now)

            for task in due_tasks(now, next_ingest_at, last_prune_date, last_digest_date):
                if task == "pruning":
                    last_prune_date = now.date()
                    _run_task(task)
                    continue
                if task == "digest":
                    last_digest_date = now.date()
                    _run_task(task)
                    continue

                try:
                    result = _run_task("ingestion")
                except Exception:
                    next_ingest_at = datetime.now() + RETRY_AFTER_ERROR
                    logger.exception(
                        "[Scheduler] Ingestion failed; retrying in %s", RETRY_AFTER_ERROR
                    )
                else:
                    next_ingest_at = next_run_after(datetime.now(), result)
                    logger.info("[Scheduler] Next ingestion run at %s", next_ingest_at)
        except Exception:
            logger.exception("[Scheduler] Tick failed; retrying in %ss", TICK_SECONDS)
        time.sleep(TICK_SECONDS)


def _run_task(name: str):
    logger.info("[Scheduler] Running %s task", name)
    if name == "ingestion":
        from ingestion.tasks import ingest_all_feeds

        result = ingest_all_feeds()
    elif name == "pruning":
        from ingestion.tasks import prune_raw_ingestions

        result = prune_raw_ingestions()
    else:
        from notifications.tasks import send_daily_cs_digest

        result = send_daily_cs_digest()
    logger.info("[Scheduler] %s finished: %s", name, result)
    return result


def _latest_event_time() -> datetime | None:
    from catalog.models import TechnologyEvent

    return TechnologyEvent.objects.order_by("-fetched_at").values_list("fetched_at", flat=True).first()
