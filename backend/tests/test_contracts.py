from __future__ import annotations

import json
from datetime import datetime, timedelta

import pytest
from django.test import Client

from accounts.models import Category, UserAccount
from catalog.models import TechnologyEvent
from core import ai
from notifications.models import NotificationEvent

pytestmark = pytest.mark.django_db


def auth_client(uid: str = "user-1", role: str = "USER") -> tuple[Client, UserAccount]:
    user = UserAccount.objects.create(
        firebase_uid=uid,
        email=f"{uid}@example.com",
        display_name="Test User",
        role=role,
        created_at=datetime.now(),
    )
    client = Client(HTTP_AUTHORIZATION=f"Bearer test:{uid}")
    return client, user


def envelope(response):
    payload = response.json()
    assert set(payload) == {"success", "message", "data", "timestamp", "traceId"}
    return payload


def make_event(event_id: str, title: str, fetched_at: datetime, topics=None) -> TechnologyEvent:
    return TechnologyEvent.objects.create(
        id=event_id,
        title=title,
        summary=f"Summary for {title}",
        categories_json=json.dumps(["Development"]),
        entities_json=json.dumps(topics or ["Python"]),
        official_links_json=json.dumps([f"https://example.com/{event_id}"]),
        credibility_score=90.0,
        importance_score=80.0,
        first_seen=fetched_at,
        last_updated=fetched_at,
        fetched_at=fetched_at,
        version_string="1.0.0",
        lifecycle_status="RELEASED",
        summary_status="READY",
    )


def test_actuator_health_is_raw():
    response = Client().get("/actuator/health")
    assert response.status_code == 200
    assert response.json() == {"status": "UP"}


def test_public_feed_envelope_and_empty_page():
    response = Client().get("/api/v1/feed")
    payload = envelope(response)
    assert response.status_code == 200
    assert payload["success"] is True
    assert payload["data"] == {"content": [], "nextCursor": None, "hasNext": False}


def test_feed_cursor_paging_is_camel_case():
    now = datetime.now()
    make_event("e1", "Newest", now)
    make_event("e2", "Older", now - timedelta(minutes=1))
    make_event("e3", "Oldest", now - timedelta(minutes=2))

    client = Client()
    first = envelope(client.get("/api/v1/feed?limit=1"))
    assert first["data"]["hasNext"] is True
    assert first["data"]["nextCursor"]
    item = first["data"]["content"][0]
    assert item["eventId"] == "e1"
    assert "originalSourceUrl" in item

    second = envelope(
        client.get(f"/api/v1/feed?limit=1&cursor={first['data']['nextCursor']}")
    )
    assert second["data"]["content"][0]["eventId"] == "e2"


def test_categories_public():
    Category.objects.create(name="Development", description="Dev")
    payload = envelope(Client().get("/api/v1/categories"))
    assert payload["data"][0]["name"] == "Development"
    assert "followerCount" in payload["data"][0]


def test_protected_route_requires_auth():
    response = Client().get("/api/v1/users/preferences")
    assert response.status_code == 401
    payload = envelope(response)
    assert payload["success"] is False
    assert payload["message"] == "Not authenticated"


def test_public_bite_detail_and_ai_routes_require_auth():
    anonymous = Client()
    # "/api/v1/bites/{id}" is public in SecurityConfig even though the Django
    # port intentionally leaves the mobile-only bite routes unmapped.
    assert anonymous.get("/api/v1/bites/bite-123").status_code != 401

    explain = anonymous.get("/api/v1/bites/explain")
    assert explain.status_code == 401
    assert envelope(explain)["message"] == "Not authenticated"


def test_admin_prefix_paths_require_admin_role():
    anonymous = Client()
    assert anonymous.get("/api/v1/admin").status_code == 401
    assert anonymous.get("/api/v1/bites/admin/feeds").status_code == 401

    regular, _ = auth_client("regular-admin-check", role="USER")
    assert regular.get("/api/v1/admin").status_code == 403
    assert regular.get("/api/v1/bites/admin/feeds").status_code == 403

    admin, _ = auth_client("admin-admin-check", role="ADMIN")
    # Authorization passes and the unmapped route falls through to a 404.
    assert admin.get("/api/v1/bites/admin/feeds").status_code == 404


def test_register_or_login_creates_user_and_returns_camel_case():
    client = Client(HTTP_AUTHORIZATION="Bearer test:new-user")
    response = client.post(
        "/api/v1/users/register-or-login",
        data=json.dumps({"displayName": "New User", "photoUrl": "https://x/y.png"}),
        content_type="application/json",
    )
    payload = envelope(response)
    assert response.status_code == 200
    assert payload["data"]["userId"]
    assert payload["data"]["hasPreferences"] is False
    assert UserAccount.objects.filter(firebase_uid="new-user").exists()


def test_search_contract_and_missing_query():
    make_event("e-search", "Kubernetes adds pod resizing", datetime.now(), ["Kubernetes"])
    client = Client()
    missing = client.get("/api/v1/search")
    assert missing.status_code == 400
    assert "query" in envelope(missing)["message"]

    payload = envelope(client.get("/api/v1/search?query=kubernetes"))
    result = payload["data"][0]
    assert result["eventId"] == "e-search"
    assert result["title"] == "Kubernetes adds pod resizing"
    assert result["relevanceScore"] > 0
    assert isinstance(result["matchReasons"], list)


def test_event_detail_and_related_routes():
    now = datetime.now()
    make_event("e-detail", "Detail Event", now, ["Python"])
    payload = envelope(Client().get("/api/v1/events/e-detail"))
    assert payload["data"]["id"] == "e-detail"
    assert payload["data"]["articleUrl"].endswith("e-detail")
    assert "technicalImpact" in payload["data"]

    assert Client().get("/api/v1/events/missing").status_code == 404
    related = envelope(Client().get("/api/v1/event/e-detail/related"))
    assert isinstance(related["data"], list)


def test_intelligence_public_reads_and_authenticated_brief(monkeypatch):
    client = Client()
    graph = envelope(client.get("/api/v1/intelligence/graph"))
    assert {node["id"] for node in graph["data"]["nodes"]} >= {"java", "react", "cve-1234"}
    assert len(graph["data"]["links"]) == 3

    technology = envelope(client.get("/api/v1/intelligence/technology/java"))
    assert technology["data"]["name"] == "Java"
    assert technology["data"]["latestVersion"] == "21.0.1"

    company = envelope(client.get("/api/v1/intelligence/company/google"))
    assert company["data"]["name"] == "Google"

    release = envelope(client.get("/api/v1/intelligence/release/r1"))
    assert release["data"]["version"] == "v3.2.0"

    timeline = envelope(client.get("/api/v1/intelligence/timeline/java"))
    assert len(timeline["data"]) == 2

    compare = envelope(
        client.post(
            "/api/v1/intelligence/compare",
            data=json.dumps({"techs": ["react", "vue"]}),
            content_type="application/json",
        )
    )
    assert compare["data"]["techNames"] == ["react", "vue"]

    # Brief is authenticated in SecurityConfig.
    assert client.post(
        "/api/v1/intelligence/brief",
        data=json.dumps({"topic": "Java 21", "format": "summary"}),
        content_type="application/json",
    ).status_code == 401

    authed, _ = auth_client("brief-user")

    def fake_generate(**kwargs):
        return ai.AIResponse(content=json.dumps({"content": "brief body"}), model="fake")

    monkeypatch.setattr(ai, "generate", fake_generate)
    response = authed.post(
        "/api/v1/intelligence/brief",
        data=json.dumps({"topic": "Java 21", "format": "SUMMARY"}),
        content_type="application/json",
    )
    payload = envelope(response)
    assert response.status_code == 200
    assert payload["data"] == {
        "topic": "Java 21",
        "format": "summary",
        "content": "brief body",
    }


def test_intelligence_brief_validation():
    client, _ = auth_client("brief-validation")
    response = client.post(
        "/api/v1/intelligence/brief",
        data=json.dumps({"topic": " ", "format": "summary"}),
        content_type="application/json",
    )
    assert response.status_code == 400
    assert envelope(response)["message"] == "topic is required"

    response = client.post(
        "/api/v1/intelligence/brief",
        data=json.dumps({"topic": "Java", "format": "podcast"}),
        content_type="application/json",
    )
    assert response.status_code == 400
    assert "summary, technical" in envelope(response)["message"]


def test_assistant_chat_contract(monkeypatch):
    client, _ = auth_client("assistant-user")

    invalid = client.post(
        "/api/v1/assistant/chat",
        data=json.dumps({"prompt": " "}),
        content_type="application/json",
    )
    assert invalid.status_code == 400
    assert envelope(invalid)["message"] == "prompt is required"

    def fake_generate(**kwargs):
        return ai.AIResponse(content=json.dumps({"content": "Hello developer"}), model="fake")

    monkeypatch.setattr(ai, "generate", fake_generate)
    response = client.post(
        "/api/v1/assistant/chat",
        data=json.dumps(
            {
                "prompt": "Explain closures",
                "history": [{"role": "user", "content": "hi"}],
                "conversationId": "conv-1",
            }
        ),
        content_type="application/json",
    )
    payload = envelope(response)
    assert response.status_code == 200
    data = payload["data"]
    assert data["conversationId"] == "conv-1"
    assert data["persisted"] is False
    assert data["title"] == "Explain closures"
    assert data["message"]["role"] == "assistant"
    assert data["message"]["content"] == "Hello developer"
    assert data["message"]["messageType"] == "markdown"
    assert data["message"]["citations"] == []

    assert client.get("/api/v1/assistant/history").json()["data"] == {
        "persisted": False,
        "conversations": [],
    }
    assert client.post("/api/v1/assistant/regenerate").status_code == 409
    feedback = client.post(
        "/api/v1/assistant/feedback",
        data=json.dumps({"messageId": "m1", "rating": "up"}),
        content_type="application/json",
    )
    assert envelope(feedback)["data"] == {"status": "SUCCESS"}


def test_assistant_context_limit(monkeypatch):
    client, _ = auth_client("assistant-limit")
    monkeypatch.setattr(
        ai,
        "generate",
        lambda **kwargs: pytest.fail("AI should not be called for oversized context"),
    )
    response = client.post(
        "/api/v1/assistant/chat",
        data=json.dumps(
            {
                "prompt": "x" * 4000,
                "history": [{"role": "user", "content": "y" * 4000}] * 3,
            }
        ),
        content_type="application/json",
    )
    assert response.status_code == 400
    assert "12000 characters" in envelope(response)["message"]


def test_notifications_contract():
    client, user = auth_client("notif-user")
    now = datetime.now()
    NotificationEvent.objects.create(
        user_id=user.id,
        title="Breaking",
        message="Something happened",
        priority="HIGH",
        is_read=False,
        event_id="e1",
        sent_at=now,
    )
    NotificationEvent.objects.create(
        user_id=user.id,
        title="Older",
        message="Older message",
        priority="NORMAL",
        is_read=True,
        sent_at=now - timedelta(minutes=5),
    )

    listing = envelope(client.get("/api/v1/notifications"))
    assert listing["data"][0]["title"] == "Breaking"
    assert listing["data"][0]["type"] == "BREAKING"
    assert listing["data"][0]["payload"] == {"eventId": "e1"}
    assert listing["data"][0]["read"] is False

    assert envelope(client.get("/api/v1/notifications/unread"))["data"] == {"count": 1}

    first_id = listing["data"][0]["id"]
    assert client.put(f"/api/v1/notifications/{first_id}/read").status_code == 200
    assert envelope(client.get("/api/v1/notifications/unread"))["data"] == {"count": 0}

    prefs = envelope(client.get("/api/v1/notifications/preferences"))
    assert prefs["data"]["frequency"] == "IMMEDIATE"
    updated = envelope(
        client.post(
            "/api/v1/notifications/preferences",
            data=json.dumps({"pushEnabled": False, "maxNotificationsPerDay": 3}),
            content_type="application/json",
        )
    )
    assert updated["data"] == {"pushEnabled": False, "maxNotificationsPerDay": 3}

    assert client.delete("/api/v1/notifications").status_code == 200
    assert NotificationEvent.objects.filter(user_id=user.id).count() == 0


def test_admin_health_is_raw_and_role_checked(monkeypatch):
    anonymous = Client().get("/api/v1/admin/news/health")
    assert anonymous.status_code == 401
    assert envelope(anonymous)["message"] == "Not authenticated"

    regular, _ = auth_client("regular-user")
    forbidden = regular.get("/api/v1/admin/news/health")
    assert forbidden.status_code == 403
    assert envelope(forbidden)["message"] == "You do not have permission to access this resource."

    admin, _ = auth_client("admin-user", role="ADMIN")
    response = admin.get("/api/v1/admin/news/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "UP"
    assert set(payload) == {"status", "timestamp", "components"}
    assert payload["components"]["redis"] == "UP"

    counts = envelope(admin.get("/api/v1/admin/news/daily-counts"))
    assert set(counts["data"]) == {"today", "yesterday"}

    trends = envelope(admin.get("/api/v1/admin/news/trends"))
    assert isinstance(trends["data"], list)

    benchmark = envelope(admin.get("/api/v1/admin/news/run-benchmarks?mode=SYNTHETIC&size=10&concurrency=2"))
    assert benchmark["data"]["processedCount"] == 10
    assert benchmark["data"]["processingRatePerSec"] == 40.0

    monkeypatch.setattr("ingestion.views.ingest_all_feeds.delay", lambda: None)
    ingest = envelope(admin.post("/api/v1/admin/news/ingest"))
    assert ingest["message"] == "News Ingestion process triggered in the background."


def test_library_bookmarks_history_and_collections():
    client, user = auth_client("library-user")
    make_event("e-lib", "Library Event", datetime.now())

    assert client.post(
        "/api/v1/user/bookmark",
        data=json.dumps({"eventId": "e-lib"}),
        content_type="application/json",
    ).status_code == 200
    bookmarks = envelope(client.get("/api/v1/user/bookmarks"))
    assert bookmarks["data"][0]["id"] == "e-lib"
    assert bookmarks["data"][0]["bookmarked"] is True

    client.post(
        "/api/v1/user/interaction",
        data=json.dumps({"eventId": "e-lib", "type": "VIEW"}),
        content_type="application/json",
    )
    history = envelope(client.get("/api/v1/user/history"))
    assert history["data"][0]["eventId"] == "e-lib"
    assert "lastOpened" in history["data"][0]

    created = envelope(
        client.post(
            "/api/v1/user/collections",
            data=json.dumps({"name": "Reading", "description": "Later"}),
            content_type="application/json",
        )
    )
    collection_id = created["data"]["id"]
    assert created["data"]["name"] == "Reading"
    assert client.post(
        f"/api/v1/user/collections/{collection_id}/events",
        data=json.dumps({"eventId": "e-lib"}),
        content_type="application/json",
    ).status_code == 200
    collections = envelope(client.get("/api/v1/user/collections"))
    assert collections["data"][0]["events"][0]["id"] == "e-lib"

    assert client.delete(f"/api/v1/user/collections/{collection_id}").status_code == 200
    assert client.delete("/api/v1/user/history").status_code == 200
    assert client.delete("/api/v1/user/bookmark/e-lib").status_code == 200


def test_preferences_and_profile():
    client, user = auth_client("prefs-user")
    Category.objects.create(name="Development", description="Dev")
    Category.objects.create(name="Cybersecurity", description="Sec")

    saved = envelope(
        client.post(
            "/api/v1/users/preferences",
            data=json.dumps({"categories": ["Development"]}),
            content_type="application/json",
        )
    )
    assert saved["data"] == {"savedCount": 1, "categories": ["Development"]}

    fetched = envelope(client.get("/api/v1/users/preferences"))
    assert fetched["data"] == ["Development"]

    profile = envelope(
        client.put(
            "/api/v1/users/profile",
            data=json.dumps({"displayName": "Renamed", "photoUrl": "https://x/y.png"}),
            content_type="application/json",
        )
    )
    assert profile["data"]["displayName"] == "Renamed"
    assert profile["data"]["preferences"] == ["Development"]
    assert profile["data"]["isOnboarded"] is True
