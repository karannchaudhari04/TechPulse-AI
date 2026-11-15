from __future__ import annotations

import logging
import threading
import uuid
from datetime import datetime

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes

from core.permissions import IsAdminRole
from core.response import fail, java_datetime, ok
from ingestion import services
from ingestion.models import NewsSource
from ingestion.tasks import LAST_RUN_CACHE_KEY, ingest_all_feeds

logger = logging.getLogger(__name__)

ADMIN = [IsAdminRole]

TRUE_VALUES = {"1", "true", "yes"}


@api_view(["GET"])
@permission_classes(ADMIN)
def health(request):
    components = {}
    status = "UP"
    try:
        count = NewsSource.objects.count()
        components["database"] = f"UP (sources count: {count})"
    except Exception as exc:
        status = "DOWN"
        components["database"] = f"DOWN ({exc})"

    components["redis"] = _redis_status()
    components["collectors"] = "UP"
    components["pipeline"] = _pipeline_status()
    # Surfaced here because a missing or invalid Gemini key is the most common
    # reason a run discovers articles and still saves nothing. It does not change
    # the overall status: that still tracks whether the pipeline can reach data.
    if settings.GEMINI_API_KEY:
        components["ai"] = f"UP (model: {settings.GEMINI_MODEL})"
    else:
        components["ai"] = "DOWN (GEMINI_API_KEY is not configured)"

    payload = {
        "status": status,
        "timestamp": java_datetime(datetime.now()),
        "components": components,
    }
    # The legacy health report is returned raw, not wrapped in the API envelope.
    return JsonResponse(payload, status=503 if status == "DOWN" else 200)


def _redis_status() -> str:
    """Round-trip through the cache; a configured but unreachable Redis is not UP.

    ``django-redis`` swallows connection errors (``IGNORE_EXCEPTIONS``), so a
    successful ``cache.set`` proves nothing. Reading the value back does.
    """
    key = "health:redis"
    token = uuid.uuid4().hex
    try:
        cache.set(key, token, timeout=30)
        value = cache.get(key)
        cache.delete(key)
    except Exception as exc:
        return f"DOWN ({exc})"
    if value != token:
        return "DOWN (cache backend is unreachable)"
    return "UP"


def _pipeline_status() -> str:
    try:
        last_run = cache.get(LAST_RUN_CACHE_KEY)
    except Exception as exc:
        return f"UNKNOWN ({exc})"
    if not isinstance(last_run, dict):
        return "UNKNOWN (no ingestion run recorded yet)"
    if last_run.get("error"):
        return f"ERROR (last run at {last_run.get('at')}: {last_run['error']})"
    if last_run.get("skipped"):
        return f"UP (last run at {last_run.get('at')} skipped: another run was in progress)"
    return (
        f"UP (last run at {last_run.get('at')}: saved {last_run.get('saved', 0)}"
        f"/{last_run.get('candidates', 0)} candidates)"
    )


@api_view(["GET"])
@permission_classes(ADMIN)
def daily_counts(request):
    return ok(services.daily_fetched_counts(), "Daily fetched update counts.")


@api_view(["GET"])
@permission_classes(ADMIN)
def trends(request):
    return ok(
        services.calculate_trends(),
        "Technology trends reports computed successfully.",
    )


@api_view(["GET"])
@permission_classes(ADMIN)
def run_benchmarks(request):
    mode = request.query_params.get("mode", "SYNTHETIC")
    try:
        size = int(request.query_params.get("size", 100))
    except (TypeError, ValueError):
        return fail("Invalid value for parameter 'size'.", 400)
    try:
        concurrency = int(request.query_params.get("concurrency", 2))
    except (TypeError, ValueError):
        return fail("Invalid value for parameter 'concurrency'.", 400)

    return ok(
        services.run_benchmark(mode, size, concurrency),
        "Benchmarks completed successfully.",
    )


@api_view(["GET", "POST"])
@permission_classes(ADMIN)
def trigger_ingest(request):
    """Start an ingestion run in the mode the caller asked for.

    * default: a daemon thread, so the request returns immediately and stays
      below Gunicorn's ``--timeout``. This is what the admin UI uses.
    * ``?async=true``: enqueue the Celery task. Only useful when a worker is
      running and consuming the queue; it returns a task id.
    * ``?sync=true``: run inline and block until the pipeline finishes. Intended
      for external schedulers and one-off diagnostics.

    Before Redis was configured the default path called ``.delay()``, which
    succeeded against the broker but no worker ever consumed the task, so
    triggering ingestion silently did nothing.
    """
    mode = (request.query_params.get("mode") or "").lower()
    sync = _flag(request, "sync") or mode == "sync"
    enqueue = _flag(request, "async") or mode == "async"

    if sync:
        logger.info("[NewsIngestion] Running ingestion synchronously on request")
        try:
            result = ingest_all_feeds()
        except Exception as exc:
            logger.exception("[NewsIngestion] Synchronous ingestion failed")
            return fail(f"News ingestion failed: {exc}", 503)
        return ok(result, "News ingestion completed.")

    if enqueue:
        try:
            task = ingest_all_feeds.delay()
        except Exception as exc:
            logger.error("[NewsIngestion] Could not enqueue ingestion task: %s", exc)
            return fail(f"Could not enqueue news ingestion: {exc}", 503)
        logger.info("[NewsIngestion] Ingestion queued as task %s", getattr(task, "id", None))
        return ok({"taskId": getattr(task, "id", None), "mode": "celery"}, "News ingestion queued.")

    _start_background_run()
    return ok(None, "News Ingestion process triggered in the background.")


def _flag(request, name: str) -> bool:
    return request.query_params.get(name, "").strip().lower() in TRUE_VALUES


def _start_background_run() -> None:
    """Run ingestion off the request thread.

    A Celery enqueue needs a worker to consume it and a blocking inline run can
    exceed Gunicorn's timeout on a slow Gemini day, so the default is a daemon
    thread inside the web process. The ingestion lock still prevents overlapping
    runs across threads and workers.
    """

    def run() -> None:
        try:
            result = ingest_all_feeds()
            logger.info("[NewsIngestion] Background ingestion finished: %s", result)
        except Exception as exc:
            logger.exception("[NewsIngestion] Background ingestion failed: %s", exc)

    threading.Thread(target=run, name="techpulse-ingest", daemon=True).start()

