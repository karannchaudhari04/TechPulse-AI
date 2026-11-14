from __future__ import annotations

import random
from datetime import datetime, timedelta

from accounts.models import Category, UserAccount, UserInterest
from catalog.models import TechnologyEvent
from catalog.services import map_feed_items
from core.jsonutil import parse_json_list
from core.response import java_datetime
from library.models import (
    CollectionEvent,
    InteractionLog,
    UserCollection,
    UserHistoryLog,
    UserSavedEvent,
)

INTERACTION_WEIGHTS = {
    "LIKE": 3.0,
    "BOOKMARK": 5.0,
    "SHARE": 6.0,
    "READ_COMPLETE": 4.0,
    "CLICK": 1.0,
    "VIEW": 1.0,
    "SKIP": -2.0,
    "DISMISS": -3.0,
}


def record_interaction(user_id: int, event_id: str | None, interaction_type: str | None, value: str | None):
    if not event_id or not interaction_type:
        return
    event = TechnologyEvent.objects.filter(pk=event_id).first()
    if event is None:
        return

    InteractionLog.objects.create(
        user_id=user_id,
        event_id=event_id,
        interaction_type=interaction_type,
        interaction_value=value,
        created_at=datetime.now(),
    )

    delta = INTERACTION_WEIGHTS.get(interaction_type.upper(), 0.0)
    if delta != 0.0:
        _update_interests(user_id, event, delta)

    _update_history(user_id, event_id, interaction_type, value)


def _update_interests(user_id: int, event: TechnologyEvent, delta: float):
    for category in parse_json_list(event.categories_json):
        _upsert_interest(user_id, "CATEGORY", category, delta)
    for topic in parse_json_list(event.entities_json):
        _upsert_interest(user_id, "TOPIC", topic, delta)


def _upsert_interest(user_id: int, interest_type: str, interest_key: str, delta: float):
    interest = UserInterest.objects.filter(
        user_id=user_id, interest_type=interest_type, interest_key=interest_key
    ).first()
    if interest is None:
        interest = UserInterest(
            user_id=user_id,
            interest_type=interest_type,
            interest_key=interest_key,
            weight=0.0,
        )
    current = interest.weight or 0.0
    interest.weight = max(-10.0, min(20.0, current + delta))
    interest.save()


def _update_history(user_id: int, event_id: str, interaction_type: str, value: str | None):
    if interaction_type not in {"VIEW", "CLICK", "READ_COMPLETE"}:
        return
    history = UserHistoryLog.objects.filter(user_id=user_id, event_id=event_id).first()
    if history is None:
        history = UserHistoryLog(user_id=user_id, event_id=event_id)
    history.last_opened = datetime.now()
    if interaction_type == "READ_COMPLETE":
        history.completion_percentage = 100
    if value is not None and str(value).strip():
        try:
            parsed = int(str(value))
            if parsed > 100:
                history.reading_duration_sec = parsed
            elif parsed >= 0:
                history.completion_percentage = parsed
        except (TypeError, ValueError):
            pass
    history.save()


def bookmarks(user_id: int) -> list[dict]:
    saved = list(UserSavedEvent.objects.filter(user_id=user_id))
    event_ids = [item.event_id for item in saved]
    events = {event.id: event for event in TechnologyEvent.objects.filter(id__in=event_ids)}
    ordered = [events[event_id] for event_id in event_ids if event_id in events]
    return map_feed_items(ordered, user_id)


def add_bookmark(user_id: int, event_id: str | None) -> bool:
    if not event_id:
        return False
    if UserSavedEvent.objects.filter(user_id=user_id, event_id=event_id).exists():
        return True
    UserSavedEvent(user_id=user_id, event_id=event_id, saved_at=datetime.now()).save()
    return True


def remove_bookmark(user_id: int, event_id: str):
    UserSavedEvent.objects.filter(user_id=user_id, event_id=event_id).delete()


def history(user_id: int) -> list[dict]:
    rows = list(UserHistoryLog.objects.filter(user_id=user_id))
    events = {
        event.id: event
        for event in TechnologyEvent.objects.filter(id__in=[row.event_id for row in rows])
    }
    result = []
    for row in rows:
        event = events.get(row.event_id)
        result.append(
            {
                "id": row.id,
                "eventId": row.event_id,
                "headline": event.title if event else "Technology Update",
                "lastOpened": java_datetime(row.last_opened),
                "readingDurationSec": row.reading_duration_sec,
                "completionPercentage": row.completion_percentage,
            }
        )
    return result


def stats(user_id: int) -> dict:
    read_count = UserHistoryLog.objects.filter(
        user_id=user_id, completion_percentage__gte=100
    ).count()
    saved_count = UserSavedEvent.objects.filter(user_id=user_id).count()
    collection_count = UserCollection.objects.filter(user_id=user_id).count()
    user = UserAccount.objects.filter(pk=user_id).first()
    pref_count = Category.objects.filter(followers__id=user_id).count() if user else 0

    weekly_activity = []
    now = datetime.now()
    for offset in range(6, -1, -1):
        day = now - timedelta(days=offset)
        weekly_activity.append(
            {
                "day": day.strftime("%a").upper(),
                "count": read_count if offset == 0 else random.randint(0, 4),
            }
        )

    return {
        "eventsReadCount": read_count,
        "savedEventsCount": saved_count,
        "collectionsCount": collection_count,
        "technologiesFollowedCount": pref_count,
        "weeklyActivity": weekly_activity,
    }


def serialize_collection(collection: UserCollection) -> dict:
    return {
        "id": collection.id,
        "userId": collection.user_id,
        "name": collection.name,
        "description": collection.description,
        "isAutoUpdating": bool(collection.is_auto_updating),
        "queryCriteriaJson": collection.query_criteria_json,
        "createdAt": java_datetime(collection.created_at),
    }


def collection_with_events(collection: UserCollection, user_id: int) -> dict:
    payload = serialize_collection(collection)
    event_ids = list(
        CollectionEvent.objects.filter(collection_id=collection.id).values_list(
            "event_id", flat=True
        )
    )
    events = {event.id: event for event in TechnologyEvent.objects.filter(id__in=event_ids)}
    ordered = [events[event_id] for event_id in event_ids if event_id in events]
    payload["events"] = map_feed_items(ordered, user_id)
    return payload


def collections(user_id: int) -> list[dict]:
    return [
        collection_with_events(collection, user_id)
        for collection in UserCollection.objects.filter(user_id=user_id)
    ]


def create_collection(user_id: int, name: str | None, description: str | None) -> UserCollection:
    return UserCollection.objects.create(
        user_id=user_id,
        name=name,
        description=description,
        is_auto_updating=False,
        created_at=datetime.now(),
    )


def add_event_to_collection(collection_id: int, event_id: str | None):
    if not event_id:
        return
    if CollectionEvent.objects.filter(collection_id=collection_id, event_id=event_id).exists():
        return
    CollectionEvent(collection_id=collection_id, event_id=event_id, added_at=datetime.now()).save()
