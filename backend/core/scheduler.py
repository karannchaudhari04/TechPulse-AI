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
from django.core.cache import cache
from django.db import close_old_connections

logger = logging.getLogger(__name__)

# Ingestion runs on fixed clock boundaries, like the Java backend's
# @Scheduled(cron = "0 0 */4 * * *"). Hours divisible by this number are the
# run times (8 -> 00:00, 08:00, 16:00 in the server timezone, UTC on Render).
DEFAULT_SCHEDULE_HOURS = 8
# A crash (database down, Gemini outage) or a lost lock race should be retried
# quickly instead of waiting for the next clock boundary.
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
_election_fd: int | None = None
_thread: threading.Thread | None = None

# The scheduler can only be inspected from the process that runs it, and the
# web service has two Gunicorn workers. Publishing a heartbeat through the cache
# lets `/api/v1/admin/news/health` answer from whichever worker handles the
# request, and it proves whether the thread is alive without Render logs.
STATE_CACHE_KEY = "scheduler:state"
STATE_CACHE_TTL = 3600


def enabled() -> bool:
    if settings.RUNNING_TESTS:
        return False
    return os.getenv("INGESTION_SCHEDULER_ENABLED", "true").lower() in {"1", "true", "yes"}


def _publish_state(**fields) -> dict:
    """Merge progress into the shared heartbeat; never raise."""
    state: dict = {}
    try:
        cached = cache.get(STATE_CACHE_KEY)
    except Exception:
        cached = None
    if isinstance(cached, dict):
        state.update(cached)
    state.update(fields)
    state["updatedAt"] = datetime.now().isoformat(timespec="seconds")
    try:
        cache.set(STATE_CACHE_KEY, state, timeout=STATE_CACHE_TTL)
    except Exception:
        pass
    return state


def _age_seconds(value) -> float | None:
    try:
        stamp = datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None
    return round((datetime.now() - stamp).total_seconds(), 1)


def schedule_hours() -> int:
    """Read the cadence, mirroring ``@Scheduled(cron = "0 0 */N * * *")``."""
    raw = os.getenv("INGESTION_SCHEDULE_HOURS", str(DEFAULT_SCHEDULE_HOURS))
    try:
        hours = int(raw)
    except (TypeError, ValueError):
        return DEFAULT_SCHEDULE_HOURS
    if not 1 <= hours <= 24:
        return DEFAULT_SCHEDULE_HOURS
    return hours


def schedule_cron() -> str:
    return f"0 0 */{schedule_hours()} * * *"


def last_scheduled_boundary(now: datetime) -> datetime:
    """The most recent clock time at which ``cron`` would have fired."""
    hours = schedule_hours()
    candidate = now.replace(minute=0, second=0, microsecond=0)
    for _ in range(48):
        if candidate.hour % hours == 0:
            return candidate
        candidate -= timedelta(hours=1)
    return candidate


def next_scheduled_boundary(now: datetime) -> datetime:
    """The next clock time at which ``cron`` will fire, strictly after ``now``."""
    hours = schedule_hours()
    candidate = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    for _ in range(48):
        if candidate.hour % hours == 0:
            return candidate
        candidate += timedelta(hours=1)
    return candidate


def state() -> dict:
    """Snapshot of the scheduler for the admin health report."""
    snapshot: dict = {}
    try:
        cached = cache.get(STATE_CACHE_KEY)
    except Exception:
        cached = None
    if isinstance(cached, dict):
        snapshot.update(cached)
    snapshot["enabled"] = enabled()
    snapshot["electedInThisWorker"] = _election_fd is not None
    snapshot["threadAliveInThisWorker"] = bool(_thread and _thread.is_alive())
    snapshot["tickSeconds"] = TICK_SECONDS
    snapshot["scheduleHours"] = schedule_hours()
    snapshot["scheduleCron"] = schedule_cron()
    snapshot["heartbeatAgeSeconds"] = _age_seconds(snapshot.get("updatedAt"))
    return snapshot


def connect() -> None:
    """Start the scheduler lazily, on the first request, never in management commands."""
    from django.core.signals import request_started

    request_started.connect(_on_request_started, dispatch_uid="core.scheduler.start")


def _on_request_started(sender, **kwargs) -> None:
    start_once()


def start_once() -> bool:
    """Start the background thread once. Returns True when this call started it.

    A daemon thread normally lives as long as the process, but a killed thread
    must not silently disable scheduling until the next deploy: the next request
    restarts it because liveness, not a one-shot flag, is the guard.
    """
    global _thread
    if not enabled():
        return False
    with _lock:
        if _thread is not None and _thread.is_alive():
            return False
        _thread = threading.Thread(target=_run_forever, name="techpulse-scheduler", daemon=True)
        _thread.start()
    _publish_state(startedAt=datetime.now().isoformat(timespec="seconds"), pid=os.getpid())
    logger.info(
        "[Scheduler] In-process scheduler started (cron %s)", schedule_cron()
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
    """Decide when to try ingestion again.

    Java's ``@Scheduled(cron=...)`` is fixed-clock: the next run is the next
    boundary no matter how many articles this one saved. Only a run that never
    happened (another worker held the lock, or ingestion is disabled) is retried
    ahead of the boundary.
    """
    if isinstance(result, dict) and result.get("skipped"):
        return now + RETRY_AFTER_ERROR
    return next_scheduled_boundary(now)


def _last_run_time() -> datetime | None:
    """When ingestion last completed, ignoring runs that never ingested.

    A failure at 09:06 must not count as "the feed is fresh": booting afterwards
    would then wait for the next boundary even though nothing was saved. The
    newest stored event is the fallback for those cases.
    """
    try:
        from ingestion.tasks import LAST_RUN_CACHE_KEY

        last_run = cache.get(LAST_RUN_CACHE_KEY)
    except Exception:
        return None
    if not isinstance(last_run, dict):
        return None
    if last_run.get("error") or last_run.get("skipped"):
        return None
    try:
        return datetime.fromisoformat(str(last_run.get("at")))
    except (TypeError, ValueError):
        return None


def _last_activity_time() -> datetime | None:
    """When ingestion last ran, falling back to the newest stored article."""
    return _last_run_time() or _latest_event_time()


def initial_next_run(now: datetime | None = None) -> datetime:
    """Catch up once when a clock boundary passed while the instance was asleep.

    Java skipped a boundary missed during downtime because the JVM was not
    running. Render's free plan sleeps after 15 idle minutes, so a missed
    boundary is normal: run once on boot, then fall back to the cron clock. The
    last-run timestamp prevents a second run inside the same boundary window,
    including a manual run or a catch-up that just finished.
    """
    now = now or datetime.now()
    boundary = last_scheduled_boundary(now)
    last_activity = _last_activity_time()
    if last_activity is not None and last_activity >= boundary:
        return next_scheduled_boundary(now)
    return now


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


def _record_scheduler_decision(reason: str, due_at: datetime | None) -> None:
    """Audit who decided to run the pipeline and why.

    ``ingestion:lastRun`` is a single slot, so a manual attempt that is skipped
    while the scheduler holds the lock disappears once the scheduler's run
    finishes. This decision entry keeps the distinction visible.
    """
    try:
        from ingestion.tasks import record_run_event

        record_run_event(
            {
                "at": datetime.now().isoformat(timespec="seconds"),
                "kind": "decision",
                "trigger": "scheduler",
                "reason": reason,
                "dueAt": due_at.isoformat(timespec="seconds") if due_at else None,
            }
        )
    except Exception:
        pass


def _run_forever() -> None:
    # Let migrations, static collection, and the first requests settle.
    time.sleep(STARTUP_DELAY_SECONDS)

    last_prune_date: date | None = None
    last_digest_date: date | None = None
    next_ingest_at: datetime | None = None
    next_reason = "boundary"
    announced = False

    while True:
        now = datetime.now()
        tick = now.isoformat(timespec="seconds")
        error: str | None = None
        try:
            # The thread is long-lived, so its database connection can outlive
            # TiDB's idle timeout. Without this, the first run after a quiet
            # period can fail in 0.0s with a bare "(0, '')" from the driver.
            close_old_connections()
            if not holds_election():
                # Another Gunicorn worker owns the schedule. It publishes the
                # heartbeat; a loser must not overwrite it with elected=false.
                time.sleep(TICK_SECONDS)
                continue

            if next_ingest_at is None:
                next_ingest_at = initial_next_run(now)
                next_reason = "catch-up" if next_ingest_at <= now else "boundary"
                if not announced:
                    announced = True
                    logger.info(
                        "[Scheduler] Elected this worker (cron %s); next ingestion run at %s",
                        schedule_cron(),
                        next_ingest_at,
                    )
                if next_ingest_at <= now:
                    logger.info(
                        "[Scheduler] Catching up: a clock boundary passed while the instance was down"
                    )

            for task in due_tasks(now, next_ingest_at, last_prune_date, last_digest_date):
                if task == "pruning":
                    last_prune_date = now.date()
                    _run_task(task)
                    continue
                if task == "digest":
                    last_digest_date = now.date()
                    _run_task(task)
                    continue

                _record_scheduler_decision(next_reason, next_ingest_at)
                try:
                    result = _run_task("ingestion")
                except Exception:
                    next_ingest_at = datetime.now() + RETRY_AFTER_ERROR
                    next_reason = "retry"
                    logger.exception(
                        "[Scheduler] Ingestion failed; retrying in %s", RETRY_AFTER_ERROR
                    )
                else:
                    next_ingest_at = next_run_after(datetime.now(), result)
                    next_reason = (
                        "retry"
                        if isinstance(result, dict) and result.get("skipped")
                        else "boundary"
                    )
                    logger.info("[Scheduler] Next ingestion run at %s", next_ingest_at)
        except Exception as exc:
            error = f"{type(exc).__name__}: {exc}"
            logger.exception("[Scheduler] Tick failed; retrying in %ss", TICK_SECONDS)
        _publish_state(
            elected=True,
            lastTickAt=tick,
            scheduleHours=schedule_hours(),
            scheduleCron=schedule_cron(),
            nextIngestAt=(
                next_ingest_at.isoformat(timespec="seconds") if next_ingest_at else None
            ),
            lastError=error,
        )
        time.sleep(TICK_SECONDS)


def _run_task(name: str):
    logger.info("[Scheduler] Running %s task", name)
    if name == "ingestion":
        from ingestion.tasks import ingest_all_feeds

        result = ingest_all_feeds(trigger="scheduler")
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
