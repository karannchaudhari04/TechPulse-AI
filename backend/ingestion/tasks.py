from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta

from celery import shared_task
from django.conf import settings
from django.core.cache import cache

from ingestion.agents.discovery import discover_and_deduplicate
from ingestion.agents.synthesis import synthesize_and_save
from ingestion.models import RawIngestion

logger = logging.getLogger(__name__)

# Summary of the most recent ingestion run, read by the admin health endpoint.
# It lives in the cache because the web process has no shared memory across
# Gunicorn workers and the database has no run-log table.
LAST_RUN_CACHE_KEY = "ingestion:lastRun"
LAST_RUN_CACHE_TTL = 7 * 24 * 3600


def record_last_run(started_at: datetime, result: dict, trigger: str = "manual") -> None:
    finished_at = datetime.now()
    payload = {
        "at": finished_at.isoformat(timespec="seconds"),
        "startedAt": started_at.isoformat(timespec="seconds"),
        "durationSeconds": round((finished_at - started_at).total_seconds(), 1),
        "trigger": trigger,
        **result,
    }
    try:
        cache.set(LAST_RUN_CACHE_KEY, payload, timeout=LAST_RUN_CACHE_TTL)
    except Exception:
        # Diagnostics must never break ingestion.
        pass


def _acquire_lock(key: str, timeout: int) -> bool:
    """Best-effort lock that fails open when the cache backend is unusable.

    ``django-redis`` is configured with ``IGNORE_EXCEPTIONS``, so a connection
    error makes ``cache.add`` return ``None`` instead of raising. Treating that
    as "lock is held" would silently skip every ingestion run, which is exactly
    what happens on a host without Redis. Only an explicit ``False`` means
    another runner owns the lock.
    """
    try:
        return cache.add(key, "locked", timeout=timeout) is not False
    except Exception:
        return True


def _release_lock(key: str) -> None:
    try:
        cache.delete(key)
    except Exception:
        pass


@shared_task(name="ingestion.tasks.scheduled_ingest")
def scheduled_ingest():
    if not settings.NEWS_INGESTION_ENABLED:
        logger.info("[NewsIngestion] Scheduled run skipped (disabled in config)")
        return {"skipped": True}

    lock_key = "lock:NewsIngestion.scheduledIngest"
    if not _acquire_lock(lock_key, timeout=15 * 60):
        logger.warning("[NewsIngestion] Scheduled run skipped (lock held by another worker)")
        return {"skipped": True}

    try:
        logger.info("[NewsIngestion] Scheduled run started at %s", datetime.now())
        return ingest_all_feeds(trigger="celery")
    finally:
        _release_lock(lock_key)


@shared_task(name="ingestion.tasks.ingest_all_feeds")
def ingest_all_feeds(trigger: str = "manual"):
    started_at = datetime.now()
    running_key = "lock:NewsIngestion.running"
    if not _acquire_lock(running_key, timeout=60 * 60):
        logger.warning("[NewsIngestion] Ingestion already in progress. Skipping.")
        result = {"skipped": True}
        record_last_run(started_at, result, trigger)
        return result

    try:
        try:
            deleted, _ = RawIngestion.objects.exclude(processing_status="PROCESSED").delete()
            if deleted > 0:
                logger.info(
                    "[NewsIngestion] Cleaned up %s old unprocessed/failed records from DB.",
                    deleted,
                )
        except Exception as exc:
            logger.warning(
                "[NewsIngestion] Could not clean old unprocessed records: %s", exc
            )

        logger.info(
            "[NewsIngestion] Starting Discovery & Deduplication phase via DiscoveryAgent..."
        )
        unique_candidates = discover_and_deduplicate()
        logger.info(
            "[NewsIngestion] Deduplication complete. Found %s unique updates to process with AISynthesisAgent.",
            len(unique_candidates),
        )

        saved_count = 0
        for candidate in unique_candidates:
            try:
                event = synthesize_and_save(candidate)
                if event is not None:
                    saved_count += 1
                else:
                    RawIngestion.objects.filter(pk=candidate.id).delete()
                if not settings.RUNNING_TESTS:
                    time.sleep(2)
            except Exception as exc:
                logger.warning(
                    "[NewsIngestion] AI Synthesis failed for raw update ID '%s': %s. "
                    "Deleting immediately from DB.",
                    candidate.id,
                    exc,
                )
                try:
                    RawIngestion.objects.filter(pk=candidate.id).delete()
                except Exception as delete_exc:
                    logger.error(
                        "[NewsIngestion] Failed to delete failed raw update '%s': %s",
                        candidate.id,
                        delete_exc,
                    )

        if saved_count > 0:
            logger.info("[NewsIngestion] Evicting feed and personalization caches...")
            invalidate_caches()
        elif unique_candidates:
            logger.error(
                "[NewsIngestion] Discovered %s article(s) but saved none. Synthesis is the "
                "only stage that can drop an eligible article, so check the [AI_SYNTHESIS] "
                "lines above and verify GEMINI_API_KEY / GEMINI_MODEL "
                "(run: python manage.py ingest_news --check-ai).",
                len(unique_candidates),
            )

        logger.info(
            "[NewsIngestion] Ingestion Completed. Successfully synthesized: %s/%s",
            saved_count,
            len(unique_candidates),
        )
        result = {"saved": saved_count, "candidates": len(unique_candidates)}
        record_last_run(started_at, result, trigger)
        return result
    except Exception as exc:
        record_last_run(started_at, {"error": str(exc)}, trigger)
        raise
    finally:
        _release_lock(running_key)


@shared_task(name="ingestion.tasks.prune_raw_ingestions")
def prune_raw_ingestions():
    processed_cutoff = datetime.now() - timedelta(days=14)
    logger.info(
        "[PruningScheduler] Starting daily pruning of raw ingestion table (processed cutoff: %s)",
        processed_cutoff,
    )
    deleted_processed = 0
    deleted_unprocessed = 0
    try:
        deleted_processed, _ = RawIngestion.objects.filter(
            fetched_at__lt=processed_cutoff,
            processing_status__in=["PROCESSED", "DUPLICATE"],
        ).delete()
        logger.info(
            "[PruningScheduler] Pruned %s old PROCESSED raw ingestion rows.",
            deleted_processed,
        )
    except Exception as exc:
        logger.error(
            "[PruningScheduler] Error pruning processed raw ingestions: %s", exc
        )
    try:
        deleted_unprocessed, _ = RawIngestion.objects.exclude(
            processing_status="PROCESSED"
        ).delete()
        if deleted_unprocessed > 0:
            logger.info(
                "[PruningScheduler] Cleaned up %s leftover unprocessed/failed raw ingestion rows.",
                deleted_unprocessed,
            )
    except Exception as exc:
        logger.error(
            "[PruningScheduler] Error cleaning unprocessed raw ingestions: %s", exc
        )
    return {
        "processed": deleted_processed,
        "unprocessed": deleted_unprocessed,
    }


def invalidate_caches() -> None:
    for key in ("trends:topic-counts-v1", "trends:admin-v1", "totalBiteCount:global"):
        try:
            cache.delete(key)
        except Exception:
            pass
    try:
        if hasattr(cache, "delete_pattern"):
            cache.delete_pattern("feed-v3:*")
            cache.delete_pattern("trends:*")
    except Exception:
        pass
