from __future__ import annotations

from datetime import datetime

from rest_framework.decorators import api_view, permission_classes

from accounts import services
from accounts.models import LoginAudit, UserAccount
from core.authentication import request_user, require_user
from core.permissions import IsAuthenticatedUser
from core.response import fail, ok

AUTH = [IsAuthenticatedUser]


def _client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR") or "unknown"


@api_view(["POST"])
def register_or_login(request):
    user = request_user(request)
    firebase_uid = user.uid if user else None
    if not firebase_uid:
        firebase_uid = request.data.get("firebase_uid") or request.data.get("uid")
    if not firebase_uid or not str(firebase_uid).strip():
        return fail("Unable to resolve Firebase UID", 401)

    account = services.sync_user(
        str(firebase_uid),
        request.data.get("email"),
        request.data.get("display_name"),
        request.data.get("photo_url"),
    )
    LoginAudit.objects.create(
        user_id=account.id,
        firebase_uid=str(firebase_uid),
        ip_address=_client_ip(request),
        status="SUCCESS",
        created_at=datetime.now(),
    )
    has_preferences = bool(services.preference_categories(account))
    return ok(
        {"userId": account.id, "hasPreferences": has_preferences},
        "User registered/logged in successfully",
    )


@api_view(["GET", "POST"])
@permission_classes(AUTH)
def preferences(request):
    account = require_user(request)
    if request.method == "POST":
        category_names = request.data.get("categories")
        if not category_names:
            return fail("At least one category must be selected.", 400)
        if not isinstance(category_names, list):
            return fail("At least one category must be selected.", 400)
        saved = services.save_preferences(account, category_names)
        return ok(
            {"savedCount": len(saved), "categories": [category.name for category in saved]},
            "Preferences saved successfully",
        )
    return ok(
        [category.name for category in services.preference_categories(account)],
        "Preferences fetched successfully",
    )


@api_view(["GET", "PUT"])
@permission_classes(AUTH)
def profile(request):
    account = require_user(request)
    if request.method == "PUT":
        display_name = request.data.get("display_name")
        photo_url = request.data.get("photo_url")
        if display_name is not None and str(display_name).strip():
            account.display_name = str(display_name).strip()
        if photo_url is not None:
            account.profile_picture_url = photo_url
        account.updated_at = datetime.now()
        account.save()
        services.evict_user_cache(account.firebase_uid)
        account = UserAccount.objects.get(pk=account.id)
    return ok(services.profile_payload(account), "Profile fetched successfully")


@api_view(["POST"])
@permission_classes(AUTH)
def register_push_token(request):
    account = require_user(request)
    account.push_token = request.data.get("token")
    account.save(update_fields=["push_token", "updated_at"])
    services.evict_user_cache(account.firebase_uid)
    return ok(None, "Push token registered successfully")


@api_view(["POST"])
@permission_classes(AUTH)
def test_push_notifications(request):
    from notifications.push import send_daily_cs_digest

    send_daily_cs_digest()
    return ok(None, "Test push campaign triggered successfully")
