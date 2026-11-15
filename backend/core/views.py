from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render

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
