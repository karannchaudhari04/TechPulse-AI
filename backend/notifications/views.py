from __future__ import annotations

from datetime import datetime

from rest_framework.decorators import api_view, permission_classes

from core.authentication import require_user
from core.permissions import IsAuthenticatedUser
from core.response import java_datetime, ok
from notifications.models import NotificationEvent

AUTH = [IsAuthenticatedUser]


def _map_notification(event: NotificationEvent) -> dict:
    item = {
        "id": str(event.id),
        "title": event.title,
        "message": event.message,
        "type": "BREAKING",
        "priority": event.priority if event.priority is not None else "NORMAL",
        "read": bool(event.is_read),
        "createdAt": java_datetime(event.sent_at) if event.sent_at else java_datetime(datetime.now()),
    }
    if event.event_id is not None:
        item["payload"] = {"eventId": event.event_id}
    return item


@api_view(["GET", "DELETE"])
@permission_classes(AUTH)
def notifications(request):
    user = require_user(request)
    if request.method == "DELETE":
        NotificationEvent.objects.filter(user_id=user.id).delete()
        return ok(None, "All notifications cleared")
    events = NotificationEvent.objects.filter(user_id=user.id).order_by("-sent_at")
    return ok(
        [_map_notification(event) for event in events],
        "Notifications fetched successfully",
    )


@api_view(["GET"])
@permission_classes(AUTH)
def unread_count(request):
    user = require_user(request)
    count = NotificationEvent.objects.filter(user_id=user.id, is_read=False).count()
    return ok({"count": count}, "Unread count fetched successfully")


@api_view(["PUT"])
@permission_classes(AUTH)
def mark_as_read(request, notification_id: int):
    user = require_user(request)
    NotificationEvent.objects.filter(
        id=notification_id, user_id=user.id
    ).update(is_read=True)
    return ok(None, "Notification marked as read")


@api_view(["PUT"])
@permission_classes(AUTH)
def mark_all_as_read(request):
    user = require_user(request)
    NotificationEvent.objects.filter(user_id=user.id).update(is_read=True)
    return ok(None, "All notifications marked as read")


@api_view(["DELETE"])
@permission_classes(AUTH)
def delete_notification(request, notification_id: int):
    user = require_user(request)
    NotificationEvent.objects.filter(id=notification_id, user_id=user.id).delete()
    return ok(None, "Notification deleted")


@api_view(["GET", "POST"])
@permission_classes(AUTH)
def notification_preferences(request):
    if request.method == "POST":
        return ok(request.data, "Notification preferences updated")
    prefs = {
        "breakingNews": True,
        "securityAlerts": True,
        "aiReleases": True,
        "frameworkUpdates": True,
        "dailyDigest": True,
        "weeklyDigest": False,
        "emailEnabled": True,
        "pushEnabled": True,
        "frequency": "IMMEDIATE",
        "maxNotificationsPerDay": 10,
    }
    return ok(prefs, "Notification preferences fetched")
