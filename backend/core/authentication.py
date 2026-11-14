from __future__ import annotations

import json
import logging

from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

logger = logging.getLogger(__name__)

_firebase_ready = False


def _init_firebase():
    global _firebase_ready
    if _firebase_ready:
        return
    try:
        import firebase_admin
        from firebase_admin import credentials
    except Exception:
        return
    if firebase_admin._apps:
        _firebase_ready = True
        return
    cred = None
    raw = getattr(settings, "FIREBASE_SERVICE_ACCOUNT_JSON", "") or ""
    path = getattr(settings, "FIREBASE_CREDENTIALS_PATH", "") or ""
    try:
        if raw.strip():
            cred = credentials.Certificate(json.loads(raw))
        elif path:
            cred = credentials.Certificate(path)
        if cred:
            firebase_admin.initialize_app(cred)
            _firebase_ready = True
    except Exception as exc:
        logger.error("[Auth] Firebase init failed: %s", exc)


class FirebaseUser:
    def __init__(self, uid: str, account=None, role: str = "USER"):
        self.uid = uid
        self.account = account
        self.role = role or "USER"
        self.is_authenticated = True
        self.is_anonymous = False
        self.pk = getattr(account, "id", None)

    @property
    def is_admin(self):
        return self.role == "ADMIN"

    def __str__(self):
        return self.uid


class FirebaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        django_request = getattr(request, "_request", request)
        if getattr(django_request, "_firebase_auth_checked", False):
            return django_request._firebase_auth_result

        header = request.META.get("HTTP_AUTHORIZATION") or ""
        if not header.startswith("Bearer "):
            return None
        token = header[7:].strip()
        if not token:
            return None

        if getattr(settings, "ALLOW_TEST_AUTH", False) and token.startswith("test:"):
            uid = token.split(":", 1)[1]
            return self._user_for_uid(uid), token

        _init_firebase()
        try:
            from firebase_admin import auth as firebase_auth

            decoded = firebase_auth.verify_id_token(token)
            uid = decoded.get("uid")
            if not uid:
                return None
            return self._user_for_uid(uid), token
        except Exception as exc:
            logger.error("[Auth] Firebase token verification failed: %s", exc)
            return None

    def _user_for_uid(self, uid: str):
        from django.core.cache import cache
        from accounts.models import UserAccount

        role = cache.get(f"user-role:{uid}")
        account = UserAccount.objects.filter(firebase_uid=uid).first()
        if account:
            role = account.role
            cache.set(f"user-role:{uid}", role, 300)
        return FirebaseUser(uid, account, role or "USER")


def request_user(request) -> FirebaseUser | None:
    user = getattr(request, "user", None)
    return user if isinstance(user, FirebaseUser) else None


def optional_user_id(request) -> int | None:
    user = request_user(request)
    if user and user.account:
        return user.account.id
    return None


def require_user(request):
    user = request_user(request)
    if not user:
        raise AuthenticationFailed("Not authenticated")
    if not user.account:
        from accounts.models import UserAccount

        account = UserAccount.objects.filter(firebase_uid=user.uid).first()
        if not account:
            raise AuthenticationFailed("User not found")
        user.account = account
    return user.account
