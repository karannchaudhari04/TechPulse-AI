"""Request sightings for the public ``/status`` page.

Render's free plan spins a service down after 15 minutes without inbound
traffic, which also stops the in-process scheduler. When a scheduled run is
missing, the only useful question is "did anything reach the service around
that time?" That answer normally lives in Render's request log, which is not
always available, so the last few probes are mirrored into Redis and exposed by
``/status``.

Recording must never slow down or break a request: every failure is swallowed
and the per-process throttle keeps the extra cache round-trips negligible.
"""

from __future__ import annotations

import threading
import time
from datetime import datetime

from django.core.cache import cache

CACHE_KEY = "diagnostics:requests"
CACHE_TTL = 24 * 3600
MAX_ENTRIES = 25

# Health checks and monitors are the interesting sightings, so they are kept at
# a finer resolution than ordinary API traffic.
PROBE_PATHS = {"/", "/actuator/health", "/status", "/internal/ingest"}
PROBE_THROTTLE_SECONDS = 5.0
GENERAL_THROTTLE_SECONDS = 60.0

_lock = threading.Lock()
_last_recorded: dict[str, float] = {}


def _is_probe(request) -> bool:
    user_agent = (request.META.get("HTTP_USER_AGENT") or "").lower()
    return request.path in PROBE_PATHS or "uptimerobot" in user_agent


def record_request(request, response=None) -> None:
    """Append a throttled sighting; safe to call from middleware."""
    try:
        probe = _is_probe(request)
        bucket = "probe" if probe else "general"
        throttle = PROBE_THROTTLE_SECONDS if probe else GENERAL_THROTTLE_SECONDS
        now = time.time()
        with _lock:
            if now - _last_recorded.get(bucket, 0.0) < throttle:
                return
            _last_recorded[bucket] = now

        entry = {
            "at": datetime.now().isoformat(timespec="seconds"),
            "method": request.method,
            "path": request.path,
            "userAgent": (request.META.get("HTTP_USER_AGENT") or "")[:200],
            "status": getattr(response, "status_code", None),
            "probe": probe,
        }
        try:
            recent = cache.get(CACHE_KEY)
        except Exception:
            recent = None
        if not isinstance(recent, list):
            recent = []
        cache.set(CACHE_KEY, [entry, *recent][:MAX_ENTRIES], timeout=CACHE_TTL)
    except Exception:
        # Diagnostics are best effort. Never turn a sighting into a 500.
        pass


def recent_requests() -> list:
    try:
        recent = cache.get(CACHE_KEY)
    except Exception:
        return []
    return recent if isinstance(recent, list) else []
