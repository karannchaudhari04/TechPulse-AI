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
import threading
import time
from datetime import date, datetime, timedelta

from django.conf import settings

logger = logging.getLogger(__name__)

# Mirrors the Java backend: @Scheduled(cron = "0 0 */4 * * *").
INGESTION_INTERVAL = timedelta(hours=4)
TICK_SECONDS = 60
STARTUP_DELAY_SECONDS = 15

_lock = threading.Lock()
_started = False


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
    last_ingest_at: datetime | None,
    last_prune_date: date | None,
    last_digest_date: date | None,
) -> list[str]:
    """Return the task names that should run at ``now``."""
    due: list[str] = []
    if last_ingest_at is None or now - last_ingest_at >= INGESTION_INTERVAL:
        due.append("ingestion")
    if now.hour == 0 and last_prune_date != now.date():
        due.append("pruning")
    if now.hour == 9 and last_digest_date != now.date():
        due.append("digest")
    return due


def _run_forever() -> None:
    # Let migrations, static collection, and the first requests settle.
    time.sleep(STARTUP_DELAY_SECONDS)

    last_prune_date: date | None = None
    last_digest_date: date | None = None
    last_ingest_at: datetime | None = None

    while True:
        try:
            now = datetime.now()
            if last_ingest_at is None:
                last_ingest_at = _latest_event_time()
            for task in due_tasks(now, last_ingest_at, last_prune_date, last_digest_date):
                if task == "ingestion":
                    # Record the attempt before running so a failure retries on the
                    # next interval instead of every tick.
                    last_ingest_at = now
                elif task == "pruning":
                    last_prune_date = now.date()
                else:
                    last_digest_date = now.date()
                _run_task(task)
        except Exception:
            logger.exception("[Scheduler] Tick failed; retrying in %ss", TICK_SECONDS)
        time.sleep(TICK_SECONDS)


def _run_task(name: str) -> None:
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


def _latest_event_time() -> datetime | None:
    from catalog.models import TechnologyEvent

    return TechnologyEvent.objects.order_by("-fetched_at").values_list("fetched_at", flat=True).first()
