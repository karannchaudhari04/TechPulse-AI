from __future__ import annotations

import time
import uuid
from collections import defaultdict, deque

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

from core.authentication import FirebaseAuthentication, FirebaseUser
from core.diagnostics import record_request
from core.response import api_payload

_local_buckets: dict[str, deque] = defaultdict(deque)


def _client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR") or "unknown"


def _consume(key: str, limit: int, window: int = 60, fail_closed: bool = False) -> bool:
    now = time.time()
    try:
        cache_key = f"rl:{key}"
        if "RedisCache" in settings.CACHES["default"]["BACKEND"]:
            from django_redis import get_redis_connection

            redis = get_redis_connection("default")
            count = redis.incr(cache.make_key(cache_key))
            if int(count) == 1:
                redis.expire(cache.make_key(cache_key), window)
            return int(count) <= limit
        count = cache.get(cache_key)
        if count is None:
            cache.set(cache_key, 1, window)
            return True
        if int(count) >= limit:
            return False
        try:
            cache.incr(cache_key)
        except Exception:
            cache.set(cache_key, int(count) + 1, window)
        return True
    except Exception:
        if fail_closed:
            raise
        bucket = _local_buckets[key]
        while bucket and now - bucket[0] > window:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        return True


class CorrelationIdMiddleware(MiddlewareMixin):
    def process_request(self, request):
        cid = request.META.get("HTTP_X_CORRELATION_ID") or str(uuid.uuid4())
        request.correlation_id = cid

    def process_response(self, request, response):
        cid = getattr(request, "correlation_id", None)
        if cid:
            response["X-Correlation-ID"] = cid
        if request.path.startswith("/api/v1/") and response.status_code >= 400:
            if "text/html" in response.get("Content-Type", ""):
                message = {
                    400: "Bad request",
                    401: "Not authenticated",
                    403: "You do not have permission to access this resource.",
                    404: "Not found",
                }.get(response.status_code, "An unexpected error occurred on the server.")
                response = JsonResponse(
                    api_payload(False, message, None, cid), status=response.status_code
                )
                if cid:
                    response["X-Correlation-ID"] = cid
        record_request(request, response)
        return response


class FirebaseAuthenticationMiddleware(MiddlewareMixin):
    """Authenticate a bearer token once so middleware and DRF share the result."""

    def process_request(self, request):
        try:
            result = FirebaseAuthentication().authenticate(request)
        except Exception:
            result = None
        request._firebase_auth_result = result
        request._firebase_auth_checked = True
        if result:
            request.user, request.auth = result


class SecurityPolicyMiddleware(MiddlewareMixin):
    """Mirror the public, authenticated, and ADMIN path rules from SecurityConfig."""

    PUBLIC_EXACT = {
        "/api/v1/bites",
        "/api/v1/bites/foryou",
        "/api/v1/feed",
        "/api/v1/feed/trending",
        "/api/v1/trends",
        "/api/v1/search",
        "/api/v1/events",
        "/api/v1/categories",
        "/api/v1/users/register-or-login",
    }
    PUBLIC_PREFIXES = (
        "/api/v1/events/",
        "/api/v1/event/",
        "/api/v1/categories/",
    )

    def process_request(self, request):
        path = request.path.rstrip("/") or "/"
        if request.method == "OPTIONS" or not path.startswith("/api/v1/"):
            return None

        user = getattr(request, "user", None)
        authenticated = bool(user and getattr(user, "is_authenticated", False))
        admin_only = path in {"/api/v1/admin", "/api/v1/bites/admin"} or path.startswith(
            ("/api/v1/admin/", "/api/v1/bites/admin/")
        )
        if admin_only and (not authenticated or not getattr(user, "is_admin", False)):
            status = 401 if not authenticated else 403
            message = "Not authenticated" if status == 401 else "You do not have permission to access this resource."
            return JsonResponse(
                api_payload(False, message, None, getattr(request, "correlation_id", None)),
                status=status,
            )

        public = (
            path in self.PUBLIC_EXACT
            or path.startswith(self.PUBLIC_PREFIXES)
            or (path.startswith("/api/v1/bites/") and path.count("/") == 4)
            or path.startswith("/api/v1/intelligence/") and path != "/api/v1/intelligence/brief"
        )
        if path.startswith("/api/v1/assistant/") or path in {
            "/api/v1/intelligence/brief",
            "/api/v1/bites/explain",
        }:
            public = False

        if path.startswith(("/api/v1/users/", "/api/v1/user/", "/api/v1/bookmarks/", "/api/v1/notifications/")):
            public = path == "/api/v1/users/register-or-login"

        if not public and not authenticated:
            return JsonResponse(
                api_payload(False, "Not authenticated", None, getattr(request, "correlation_id", None)),
                status=401,
            )
        return None


class RateLimitMiddleware(MiddlewareMixin):
    def process_request(self, request):
        path = request.path
        if not path.startswith("/api/v1/"):
            return None
        paid_ai = path in {
            "/api/v1/assistant/chat",
            "/api/v1/assistant/regenerate",
            "/api/v1/intelligence/brief",
            "/api/v1/bites/explain",
        }
        user = request.user if isinstance(getattr(request, "user", None), FirebaseUser) else None
        try:
            if paid_ai:
                if user is None:
                    return JsonResponse(
                        api_payload(False, "Not authenticated", None, getattr(request, "correlation_id", None)),
                        status=401,
                    )
                allowed = _consume(
                    f"AI_USER_{user.uid}", settings.AI_RATE_LIMIT_PER_USER_PER_MINUTE, fail_closed=True
                ) and _consume(
                    f"AI_IP_{_client_ip(request)}", settings.AI_RATE_LIMIT_PER_IP_PER_MINUTE,
                    fail_closed=True,
                )
            else:
                if user is not None:
                    allowed = _consume(f"AUTH_{user.uid}", 200)
                else:
                    allowed = _consume(f"GUEST_{_client_ip(request)}", 60)
            if not allowed:
                return JsonResponse(
                    api_payload(False, "Too many requests. Please try again later.", None, request.correlation_id),
                    status=429,
                )
        except Exception:
            if paid_ai:
                return JsonResponse(
                    api_payload(False, "AI request throttling is unavailable.", None, request.correlation_id),
                    status=503,
                )
        return None
