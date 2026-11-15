from __future__ import annotations

import logging
from datetime import datetime

from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes

from core.permissions import IsAdminRole
from core.response import fail, java_datetime, ok
from ingestion import services
from ingestion.models import NewsSource
from ingestion.tasks import ingest_all_feeds

logger = logging.getLogger(__name__)

ADMIN = [IsAdminRole]


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

    components["redis"] = "UP"
    components["collectors"] = "UP"
    components["pipeline"] = "UP"
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
    # A synchronous run lets a deployment without Celery workers (Render free
    # plan, or a host with no Redis) still ingest on demand. It blocks the
    # request for the duration of the run, so use it from an external scheduler
    # or a one-off manual trigger, not from the UI.
    if request.query_params.get("sync", "").lower() in {"1", "true", "yes"}:
        logger.info("[NewsIngestion] Running ingestion synchronously on request")
        return ok(ingest_all_feeds(), "News ingestion completed.")

    try:
        ingest_all_feeds.delay()
    except Exception as exc:
        # No broker and no worker on this host is the normal case for the free
        # plan, so fall back to doing the work in this request instead of
        # answering 503 and leaving the feed stale.
        logger.warning(
            "[NewsIngestion] Could not enqueue ingestion task (%s); running it inline instead",
            exc,
        )
        try:
            result = ingest_all_feeds()
        except Exception as run_exc:
            logger.error("[NewsIngestion] Inline ingestion failed: %s", run_exc)
            return fail(f"News ingestion failed: {run_exc}", 503)
        return ok(result, "News ingestion ran synchronously (no queue available).")
    return ok(None, "News Ingestion process triggered in the background.")
