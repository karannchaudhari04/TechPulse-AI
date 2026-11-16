from __future__ import annotations

import hmac
import logging
import os
import threading
import uuid
from datetime import datetime

from django.conf import settings
from django.core.cache import cache
from django.http import Http404, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes

from core.permissions import IsAdminRole
from core.response import api_payload, fail, java_datetime, ok
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
    components["scheduler"] = _scheduler_status()
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
    trigger = last_run.get("trigger")
    source = f", trigger {trigger}" if trigger else ""
    if last_run.get("skipped"):
        return (
            f"UP (last run at {last_run.get('at')} skipped: another run was in progress{source})"
        )
    return (
        f"UP (last run at {last_run.get('at')}: saved {last_run.get('saved', 0)}"
        f"/{last_run.get('candidates', 0)} candidates{source})"
    )


def _scheduler_status() -> str:
    """Report the in-process scheduler's heartbeat.

    On Render's free plan the daemon thread exists only while the instance is
    awake. Without this component "no automatic runs" is indistinguishable from
    "the scheduler never started", "it is asleep", and "it is running fine", so
    the report includes the next run and the age of the last heartbeat.
    """
    from core import scheduler

    if not scheduler.enabled():
        return "DISABLED (INGESTION_SCHEDULER_ENABLED is false)"

    state = scheduler.state()
    if not state.get("startedAt"):
        return "DOWN (never started: no HTTP request has reached this instance yet)"

    age = state.get("heartbeatAgeSeconds")
    limit = 3 * int(state.get("tickSeconds") or 60)
    if age is None:
        return f"DOWN (started {state['startedAt']} but never recorded a tick)"
    if age > limit:
        return (
            f"DOWN (last heartbeat {age:.0f}s ago at {state.get('updatedAt')}; "
            "the instance is asleep or the scheduler thread died)"
        )
    return (
        f"UP (started {state['startedAt']}, elected={state.get('elected')}, "
        f"next run {state.get('nextIngestAt') or 'unknown'}, "
        f"heartbeat {age:.0f}s ago)"
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
    params = getattr(request, "query_params", None)
    if params is None:
        params = request.GET
    return str(params.get(name, "")).strip().lower() in TRUE_VALUES


def _start_background_run(trigger: str = "manual") -> None:
    """Run ingestion off the request thread.

    A Celery enqueue needs a worker to consume it and a blocking inline run can
    exceed Gunicorn's timeout on a slow Gemini day, so the default is a daemon
    thread inside the web process. The ingestion lock still prevents overlapping
    runs across threads and workers.
    """

    def run() -> None:
        try:
            result = ingest_all_feeds(trigger=trigger)
            logger.info("[NewsIngestion] Background ingestion finished: %s", result)
        except Exception as exc:
            logger.exception("[NewsIngestion] Background ingestion failed: %s", exc)

    threading.Thread(target=run, name="techpulse-ingest", daemon=True).start()


@csrf_exempt
@require_http_methods(["GET", "POST"])
def internal_ingest(request):
    """Wake the service and start ingestion from an external scheduler.

    Render's free plan spins the web service down after 15 minutes without
    inbound traffic, which also stops the in-process scheduler. A cron service
    (cron-job.org, GitHub Actions, UptimeRobot with a paid plan, ...) can call
    this endpoint every few hours: the request boots or keeps the instance awake
    and the run continues in a daemon thread after the response is returned.

    It purposely lives outside ``/api/v1`` so it does not need a Firebase token
    (no worker or service account is available to a cron job); the shared secret
    in ``INGEST_TRIGGER_TOKEN`` is the authentication. When the variable is not
    set the route 404s, so an unconfigured deployment exposes nothing.
    """
    token = os.getenv("INGEST_TRIGGER_TOKEN", "")
    if not token:
        raise Http404

    provided = request.headers.get("X-Ingest-Token") or request.GET.get("token", "")
    if not hmac.compare_digest(provided, token):
        return JsonResponse(
            api_payload(
                False, "Invalid ingestion token.", None, getattr(request, "correlation_id", None)
            ),
            status=403,
        )

    if _flag(request, "sync"):
        logger.info("[NewsIngestion] Running ingestion synchronously for an external scheduler")
        try:
            result = ingest_all_feeds(trigger="cron")
        except Exception as exc:
            logger.exception("[NewsIngestion] External synchronous ingestion failed")
            return JsonResponse(
                api_payload(
                    False,
                    f"News ingestion failed: {exc}",
                    None,
                    getattr(request, "correlation_id", None),
                ),
                status=503,
            )
        return JsonResponse(
            api_payload(
                True, "News ingestion completed.", result, getattr(request, "correlation_id", None)
            )
        )

    _start_background_run(trigger="cron")
    logger.info("[NewsIngestion] External scheduler triggered ingestion in the background")
    return JsonResponse(
        api_payload(
            True,
            "News ingestion triggered in the background.",
            {"mode": "background"},
            getattr(request, "correlation_id", None),
        )
    )
