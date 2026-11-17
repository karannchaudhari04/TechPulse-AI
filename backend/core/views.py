import os
from datetime import datetime

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods

def index(request):
    from catalog.models import TechnologyEvent

    count = cache.get("totalBiteCount:global")
    if count is None:
        count = TechnologyEvent.objects.count()
        cache.set("totalBiteCount:global", count, 60)
    return HttpResponse(f"TechPulse AI API is Live. Total Events: {count}")


def actuator_health(request):
    # Render probes this path with HEAD. Django does not strip bodies for HEAD,
    # and Gunicorn then logs "sent body bytes on a no-body response" for every
    # probe, so answer HEAD with headers only.
    if request.method == "HEAD":
        return HttpResponse(status=200, content_type="application/json")
    return JsonResponse({"status": "UP"})


@require_http_methods(["GET", "HEAD"])
def status(request):
    """Public, read-only diagnostics for the scheduler and request sightings.

    It answers without Firebase auth because the questions it settles ("is the
    scheduler alive", "did the uptime monitor reach the service", "which commit
    is live") must be answerable from a browser or a shell, exactly when the
    admin token is the thing that is unavailable.
    """
    if request.method == "HEAD":
        return HttpResponse(status=200, content_type="application/json")

    from catalog.models import TechnologyEvent
    from core import diagnostics, scheduler
    from ingestion.tasks import LAST_RUN_CACHE_KEY, recent_runs

    try:
        last_run = cache.get(LAST_RUN_CACHE_KEY)
    except Exception:
        last_run = None

    database = None
    try:
        newest = (
            TechnologyEvent.objects.order_by("-fetched_at")
            .values_list("fetched_at", flat=True)
            .first()
        )
        database = {
            "status": "UP",
            "events": TechnologyEvent.objects.count(),
            "newestFetchedAt": newest.isoformat(timespec="seconds") if newest else None,
        }
    except Exception as exc:
        database = {"status": "DOWN", "error": str(exc)[:200]}

    payload = {
        "status": "UP",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        # Every timestamp in this report (and the scheduler clock) is UTC. The
        # field is explicit because the naive ISO strings look like local time.
        "timezone": "UTC",
        "commit": os.getenv("RENDER_GIT_COMMIT") or os.getenv("GIT_COMMIT") or None,
        "ingestTriggerTokenConfigured": bool(os.getenv("INGEST_TRIGGER_TOKEN")),
        "scheduler": scheduler.state(),
        "lastRun": last_run if isinstance(last_run, dict) else None,
        "recentRuns": recent_runs(),
        "database": database,
        "requests": diagnostics.recent_requests(),
    }
    return JsonResponse(payload)


def asset_links(request):
    payload = [
        {
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": "com.techpulse.app",
                "sha256_cert_fingerprints": [settings.ANDROID_SHA256_FINGERPRINT],
            },
        }
    ]
    return JsonResponse(payload, safe=False)


def deep_link(request, event_id: str):
    from catalog.models import TechnologyEvent

    event = TechnologyEvent.objects.filter(pk=event_id).first()
    context = {
        "id": event.id if event else "",
        "title": event.title if event else "TechPulse AI | Technology Intelligence",
        "summary": event.summary if event else "AI-powered technology intelligence platform for developers.",
        "thumbnail": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800",
        "category": "Tech",
    }
    return render(request, "deeplink.html", context)
