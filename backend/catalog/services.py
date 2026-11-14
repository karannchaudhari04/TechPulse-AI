from __future__ import annotations

import base64
import uuid
from datetime import datetime

from django.core.cache import cache
from django.db.models import Q

from accounts.models import Category, UserFollow
from catalog.models import TechnologyEvent
from core.jsonutil import parse_json_list
from core.response import java_datetime
from ingestion.models import RawIngestion
from library.models import UserHistoryLog, UserSavedEvent


def normalize_filter(value: str | None) -> str | None:
    if value is None or not str(value).strip() or str(value).strip().lower() == "all":
        return None
    normalized = str(value).strip().lower().replace("%", "").replace("_", "")
    return normalized[:100] or None


def event_fetch_time(event: TechnologyEvent):
    return event.fetched_at or event.last_updated or event.first_seen


def encode_feed_cursor(event: TechnologyEvent) -> str:
    fetched_at = event_fetch_time(event)
    if fetched_at is None:
        return event.id
    value = f"{java_datetime(fetched_at)}\n{event.id}"
    return base64.urlsafe_b64encode(value.encode("utf-8")).decode("ascii").rstrip("=")


def decode_feed_cursor(token: str | None) -> tuple[datetime | None, str | None]:
    if not token or not str(token).strip():
        return None, None
    raw = str(token).strip()
    try:
        padding = "=" * (-len(raw) % 4)
        decoded = base64.urlsafe_b64decode(raw + padding).decode("utf-8")
        parts = decoded.split("\n", 1)
        if len(parts) == 2:
            return datetime.fromisoformat(parts[0]), parts[1]
    except (ValueError, UnicodeDecodeError):
        # Backward compatibility: older clients send the event ID as the cursor.
        pass
    event = TechnologyEvent.objects.filter(pk=raw).first()
    if event is not None:
        return event_fetch_time(event), event.id
    return None, None


def _feed_cache_key(category: str | None, tech: str | None, cursor, limit: int) -> str:
    cursor_key = (
        "first"
        if cursor == (None, None)
        else f"{java_datetime(cursor[0]) if cursor[0] else ''}:{cursor[1] or ''}"
    )
    seed = f"{category or ''}|{tech or ''}|{cursor_key}|{limit}".encode("utf-8")
    return f"feed-v3:{uuid.uuid5(uuid.NAMESPACE_URL, seed.decode('utf-8'))}"


def get_feed_page(
    category: str | None,
    tech: str | None,
    cursor: tuple[datetime | None, str | None],
    limit: int,
) -> list[TechnologyEvent]:
    category_filter = normalize_filter(category)
    tech_filter = normalize_filter(tech)
    cache_key = _feed_cache_key(category_filter, tech_filter, cursor, limit)

    cached_ids = cache.get(cache_key)
    if isinstance(cached_ids, list):
        events_by_id = {e.id: e for e in TechnologyEvent.objects.filter(id__in=cached_ids)}
        return [events_by_id[event_id] for event_id in cached_ids if event_id in events_by_id]

    qs = TechnologyEvent.objects.all()
    if category_filter:
        qs = qs.filter(categories_json__icontains=category_filter)
    if tech_filter:
        qs = qs.filter(entities_json__icontains=tech_filter)
    cursor_fetched_at, cursor_id = cursor
    if cursor_fetched_at is not None and cursor_id is not None:
        qs = qs.filter(
            Q(fetched_at__lt=cursor_fetched_at)
            | Q(fetched_at=cursor_fetched_at, id__lt=cursor_id)
        )
    page = list(qs.order_by("-fetched_at", "-id")[:limit])

    try:
        cache.set(cache_key, [event.id for event in page], 60)
    except Exception:
        pass
    return page


def _source_names(event_ids: list[str]) -> dict[str, str]:
    if not event_ids:
        return {}
    names: dict[str, str] = {}
    rows = (
        RawIngestion.objects.filter(event_id__in=event_ids)
        .order_by("-fetched_at")
        .values_list("event_id", "source_name")
    )
    for event_id, source_name in rows:
        if event_id and source_name and source_name.strip():
            names.setdefault(event_id, source_name)
    return names


def _bookmarked_ids(user_id: int | None, event_ids: list[str]) -> set[str]:
    if user_id is None or not event_ids:
        return set()
    return set(
        UserSavedEvent.objects.filter(user_id=user_id, event_id__in=event_ids).values_list(
            "event_id", flat=True
        )
    )


def _completed_ids(user_id: int | None, event_ids: list[str]) -> set[str]:
    if user_id is None or not event_ids:
        return set()
    return set(
        UserHistoryLog.objects.filter(
            user_id=user_id, event_id__in=event_ids, completion_percentage__gte=100
        ).values_list("event_id", flat=True)
    )


def map_feed_items(events, user_id: int | None = None) -> list[dict]:
    events = list(events)
    if not events:
        return []
    event_ids = [event.id for event in events]
    source_names = _source_names(event_ids)
    bookmarked = _bookmarked_ids(user_id, event_ids)
    completed = _completed_ids(user_id, event_ids)
    return [
        map_feed_item(
            event,
            bookmarked=event.id in bookmarked,
            read=event.id in completed,
            source_name=source_names.get(event.id),
        )
        for event in events
    ]


def map_feed_item(
    event: TechnologyEvent,
    bookmarked: bool = False,
    read: bool = False,
    source_name: str | None = None,
) -> dict:
    summary = event.summary if event.summary is not None else ""
    links = parse_json_list(event.official_links_json)
    source_url = links[0] if links else ""
    categories = parse_json_list(event.categories_json)
    entities = parse_json_list(event.entities_json)
    category = categories[0] if categories else "Emerging Tech"
    fetched_at = event_fetch_time(event)

    return {
        "id": event.id,
        "eventId": event.id,
        "headline": event.title,
        "title": event.title,
        "summary": summary,
        "contentSummary": summary,
        "publishedTime": java_datetime(event.first_seen) or "",
        "fetchedAt": java_datetime(fetched_at) or "",
        "sourceName": source_name if source_name is not None else "Source",
        "sourceUrl": source_url,
        "originalSourceUrl": source_url,
        "importanceScore": event.importance_score if event.importance_score is not None else 70.0,
        "credibilityScore": event.credibility_score if event.credibility_score is not None else 80.0,
        "category": category,
        "categoryName": category,
        "technology": entities[0] if entities else "General",
        "technologies": entities,
        "version": event.version_string,
        "releaseStatus": event.lifecycle_status,
        "trendStatus": "RISING",
        "bookmarked": bookmarked,
        "read": read,
    }


def sort_newest_first(events: list[TechnologyEvent]) -> list[TechnologyEvent]:
    def key(event: TechnologyEvent):
        fetched_at = event_fetch_time(event)
        return (fetched_at is not None, fetched_at or datetime.min, event.id or "")

    return sorted(events, key=key, reverse=True)


def get_topic_counts() -> dict[str, int]:
    cached = cache.get("trends:topic-counts-v1")
    if isinstance(cached, dict):
        return {str(k): int(v) for k, v in cached.items()}

    counts: dict[str, int] = {}
    for event in TechnologyEvent.objects.all().only("id", "entities_json"):
        for topic in parse_json_list(event.entities_json):
            counts[topic] = counts.get(topic, 0) + 1
    try:
        cache.set("trends:topic-counts-v1", counts, 300)
    except Exception:
        pass
    return counts


def build_trends(user_id: int | None) -> list[dict]:
    topic_counts = get_topic_counts()
    preferred: set[str] = set()
    followed: set[str] = set()
    if user_id is not None:
        preferred = set(
            Category.objects.filter(followers__id=user_id).values_list("name", flat=True)
        )
        followed = set(
            UserFollow.objects.filter(user_id=user_id, entity_type="TOPIC").values_list(
                "entity_name", flat=True
            )
        )

    ordered = sorted(topic_counts.items(), key=lambda item: item[1], reverse=True)[:15]
    result = []
    for name, count in ordered:
        status = "EXPLODING" if count >= 10 else ("RISING" if count >= 5 else "STABLE")
        result.append(
            {
                "name": name,
                "eventCount": count,
                "trendStatus": status,
                "following": name in preferred or name in followed,
            }
        )
    return result


def search_events(query: str | None) -> list[dict]:
    if query is None or not str(query).strip():
        return []
    q = str(query).lower().strip().replace("%", "").replace("_", "")[:100]
    if not q:
        return []

    candidates = list(
        TechnologyEvent.objects.filter(
            Q(title__icontains=q) | Q(summary__icontains=q) | Q(entities_json__icontains=q)
        ).order_by("-fetched_at", "-id")[:100]
    )

    results = []
    for event in candidates:
        score = 0.0
        reasons: list[str] = []
        if event.title and q in event.title.lower():
            score += 10.0
            reasons.append("Title match")
        if event.summary and q in event.summary.lower():
            score += 5.0
            reasons.append("Summary match")
        for topic in parse_json_list(event.entities_json):
            if q in topic.lower():
                score += 7.0
                reasons.append("Topic match: " + topic)
        if score > 0.0:
            results.append(
                {
                    "eventId": event.id,
                    "title": event.title,
                    "relevanceScore": score,
                    "matchReasons": reasons,
                }
            )
    results.sort(key=lambda item: item["relevanceScore"], reverse=True)
    return results


def related_events(event: TechnologyEvent) -> list[TechnologyEvent]:
    candidates: dict[str, TechnologyEvent] = {}
    for topic in parse_json_list(event.entities_json)[:5]:
        matches = (
            TechnologyEvent.objects.filter(entities_json__icontains=topic)
            .exclude(id=event.id)
            .order_by("-fetched_at", "-id")[:20]
        )
        for match in matches:
            candidates.setdefault(match.id, match)
    return sort_newest_first(list(candidates.values()))[:5]


def categories_payload() -> list[dict]:
    return [
        {
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "followerCount": category.follower_count or 0,
            "createdAt": java_datetime(category.created_at),
        }
        for category in Category.objects.order_by("name")
    ]
