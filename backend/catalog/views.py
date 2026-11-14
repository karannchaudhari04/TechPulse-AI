from __future__ import annotations

from rest_framework.decorators import api_view

from catalog import services
from catalog.models import TechnologyEvent
from core.authentication import optional_user_id
from core.response import fail, ok

FEED_MESSAGES = {
    "feed": "Feed fetched successfully.",
    "trending": "Trending feed fetched successfully.",
    "trends": "Technology trends fetched successfully.",
    "categories": "Categories fetched successfully",
    "search": "Search completed successfully.",
    "related": "Related events fetched successfully.",
}


@api_view(["GET"])
def feed(request):
    try:
        limit = int(request.query_params.get("limit", 10))
    except (TypeError, ValueError):
        return fail("Invalid value for parameter 'limit'.", 400)
    page_size = max(1, min(limit, 50))
    cursor = services.decode_feed_cursor(request.query_params.get("cursor"))
    candidates = services.get_feed_page(
        request.query_params.get("category"),
        request.query_params.get("tech"),
        cursor,
        page_size + 1,
    )
    has_next = len(candidates) > page_size
    page_content = candidates[:page_size] if has_next else candidates
    next_cursor = services.encode_feed_cursor(page_content[-1]) if page_content else None
    content = services.map_feed_items(page_content, optional_user_id(request))
    return ok(
        {"content": content, "nextCursor": next_cursor, "hasNext": has_next},
        FEED_MESSAGES["feed"],
    )


@api_view(["GET"])
def trending_feed(request):
    events = TechnologyEvent.objects.order_by("-fetched_at", "-id")[:20]
    content = services.map_feed_items(events, optional_user_id(request))
    return ok(content, FEED_MESSAGES["trending"])


@api_view(["GET"])
def trends(request):
    return ok(services.build_trends(optional_user_id(request)), FEED_MESSAGES["trends"])


@api_view(["GET"])
def categories(request):
    return ok(services.categories_payload(), FEED_MESSAGES["categories"])


@api_view(["GET"])
def search(request):
    query = request.query_params.get("query")
    if query is None:
        return fail("Required request parameter 'query' is not present.", 400)
    if not str(query).strip():
        return ok([], "Empty query.")
    return ok(services.search_events(query), FEED_MESSAGES["search"])


@api_view(["GET"])
def event_detail(request, event_id: str):
    user_id = optional_user_id(request)
    event = TechnologyEvent.objects.filter(pk=event_id).first()
    if event is None:
        return fail("Event not found.", 404)

    details = services.map_feed_items([event], user_id)[0]

    from ingestion.models import RawIngestion

    latest_raw = RawIngestion.objects.filter(event_id=event_id).order_by("-fetched_at").first()
    article_url = latest_raw.url if latest_raw and latest_raw.url else ""
    if not article_url:
        links = services.parse_json_list(event.official_links_json)
        article_url = links[0] if links else ""

    details["articleUrl"] = article_url
    details["sourceUrl"] = article_url
    details["originalSourceUrl"] = article_url
    details["technicalImpact"] = event.technical_impact
    details["developerImpact"] = event.developer_impact
    details["enterpriseImpact"] = event.enterprise_impact
    details["migrationNotes"] = event.migration_notes
    details["breakingChanges"] = event.breaking_changes
    details["securityNotes"] = event.security_notes
    return ok(details, "Event found.")


@api_view(["GET"])
def related_events(request, event_id: str):
    user_id = optional_user_id(request)
    event = TechnologyEvent.objects.filter(pk=event_id).first()
    if event is None:
        return fail("Event not found.", 404)
    related = services.related_events(event)
    return ok(services.map_feed_items(related, user_id), FEED_MESSAGES["related"])
