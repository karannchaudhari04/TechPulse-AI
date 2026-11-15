from __future__ import annotations

import threading
from datetime import date, datetime, timedelta
from types import SimpleNamespace

import pytest
from django.core.cache import cache
from django.test import Client, RequestFactory

from accounts.models import UserAccount
from core import scheduler
from core.views import actuator_health
from ingestion import tasks, views
from ingestion.agents.text import is_eligible

pytestmark = pytest.mark.django_db


def admin_client(uid: str = "admin-scheduler") -> Client:
    UserAccount.objects.create(
        firebase_uid=uid,
        email=f"{uid}@example.com",
        display_name="Admin",
        role="ADMIN",
        created_at=datetime.now(),
    )
    return Client(HTTP_AUTHORIZATION=f"Bearer test:{uid}")


def test_lock_fails_open_when_the_cache_backend_is_unavailable(monkeypatch):
    """django-redis returns None, not False, when it swallows a connection error."""
    monkeypatch.setattr(tasks.cache, "add", lambda *args, **kwargs: None)
    assert tasks._acquire_lock("lock:test", timeout=60) is True


def test_lock_is_respected_when_another_run_holds_it(monkeypatch):
    monkeypatch.setattr(tasks.cache, "add", lambda *args, **kwargs: False)
    assert tasks._acquire_lock("lock:test", timeout=60) is False


def test_lock_is_acquired_when_the_cache_returns_true(monkeypatch):
    monkeypatch.setattr(tasks.cache, "add", lambda *args, **kwargs: True)
    assert tasks._acquire_lock("lock:test", timeout=60) is True


def test_ingest_all_feeds_does_not_skip_when_redis_is_down(monkeypatch):
    """A dead cache must not be mistaken for a held lock."""
    monkeypatch.setattr(tasks.cache, "add", lambda *args, **kwargs: None)
    monkeypatch.setattr(tasks, "discover_and_deduplicate", list)
    monkeypatch.setattr(tasks.RawIngestion.objects, "exclude", lambda *a, **k: _NoRows())

    assert tasks.ingest_all_feeds() == {"saved": 0, "candidates": 0}


class _NoRows:
    def delete(self):
        return 0, {}


def test_trigger_ingest_runs_in_the_background_by_default(monkeypatch):
    """Redis makes .delay() succeed even with no worker, so run it in-process."""
    done = threading.Event()

    def fake_run():
        done.set()
        return {"saved": 1, "candidates": 2}

    monkeypatch.setattr("ingestion.views.ingest_all_feeds", fake_run)

    response = admin_client().post("/api/v1/admin/news/ingest")
    payload = response.json()

    assert response.status_code == 200
    assert payload["success"] is True
    assert payload["data"] is None
    assert "background" in payload["message"]
    # The thread outlives the request; wait for it instead of sleeping.
    assert done.wait(5)


def test_trigger_ingest_async_enqueues_for_a_worker(monkeypatch):
    calls = []

    class FakeTask:
        def delay(self):
            calls.append(True)
            return SimpleNamespace(id="task-1")

        def __call__(self):
            raise AssertionError("async mode must not run inline")

    monkeypatch.setattr("ingestion.views.ingest_all_feeds", FakeTask())

    response = admin_client("admin-async").post("/api/v1/admin/news/ingest?async=true")
    payload = response.json()

    assert response.status_code == 200
    assert payload["data"] == {"mode": "celery", "taskId": "task-1"}
    assert calls == [True]


def test_trigger_ingest_async_reports_a_missing_broker(monkeypatch):
    class BrokenTask:
        def delay(self):
            raise ConnectionError("broker unavailable")

    monkeypatch.setattr("ingestion.views.ingest_all_feeds", BrokenTask())

    response = admin_client("admin-broken").post("/api/v1/admin/news/ingest?async=true")
    payload = response.json()

    assert response.status_code == 503
    assert payload["success"] is False
    assert "enqueue" in payload["message"]


def test_trigger_ingest_sync_runs_inline(monkeypatch):
    monkeypatch.setattr(
        "ingestion.views.ingest_all_feeds",
        lambda: {"saved": 2, "candidates": 3},
    )

    response = admin_client("admin-sync").post("/api/v1/admin/news/ingest?sync=true")
    payload = response.json()

    assert response.status_code == 200
    assert payload["data"] == {"saved": 2, "candidates": 3}


def test_admin_health_reports_a_real_redis_round_trip():
    response = admin_client("admin-health").get("/api/v1/admin/news/health")
    payload = response.json()

    assert response.status_code == 200
    assert payload["components"]["redis"] == "UP"


def test_admin_health_reports_redis_down_when_writes_are_swallowed(monkeypatch):
    """django-redis ignores connection errors, so a write-only probe lies."""
    monkeypatch.setattr(views.cache, "get", lambda *args, **kwargs: None)

    response = admin_client("admin-health-down").get("/api/v1/admin/news/health")

    assert "DOWN" in response.json()["components"]["redis"]


def test_admin_health_reports_the_last_ingestion_run():
    cache.set(
        tasks.LAST_RUN_CACHE_KEY,
        {"at": "2026-11-15T18:00:00", "saved": 3, "candidates": 4},
        timeout=60,
    )

    response = admin_client("admin-health-run").get("/api/v1/admin/news/health")

    assert "saved 3/4" in response.json()["components"]["pipeline"]


def test_ingest_all_feeds_records_the_last_run(monkeypatch):
    monkeypatch.setattr(tasks.cache, "add", lambda *args, **kwargs: True)
    monkeypatch.setattr(tasks, "discover_and_deduplicate", list)
    monkeypatch.setattr(tasks.RawIngestion.objects, "exclude", lambda *a, **k: _NoRows())

    assert tasks.ingest_all_feeds() == {"saved": 0, "candidates": 0}

    last_run = cache.get(tasks.LAST_RUN_CACHE_KEY)
    assert last_run["saved"] == 0
    assert last_run["candidates"] == 0
    assert last_run["at"]


def test_actuator_health_head_has_no_body():
    response = actuator_health(RequestFactory().head("/actuator/health"))
    assert response.status_code == 200
    assert response.content == b""


def test_scheduler_runs_ingestion_when_it_has_never_run():
    now = datetime(2026, 11, 15, 12, 0)
    assert "ingestion" in scheduler.due_tasks(now, None, None, None)


def test_scheduler_waits_until_the_next_run_time():
    now = datetime(2026, 11, 15, 12, 0)
    today = date(2026, 11, 15)

    assert "ingestion" not in scheduler.due_tasks(
        now, now + timedelta(minutes=1), today, today
    )
    assert "ingestion" in scheduler.due_tasks(now, now, today, today)


def test_next_run_is_four_hours_after_a_productive_run():
    now = datetime(2026, 11, 15, 12, 0)
    assert scheduler.next_run_after(now, {"saved": 3, "candidates": 5}) == now + timedelta(
        hours=4
    )


def test_next_run_is_one_hour_after_an_empty_run():
    """No fresh articles is normal; do not wait four hours to look again."""
    now = datetime(2026, 11, 15, 12, 0)
    assert scheduler.next_run_after(now, {"saved": 0, "candidates": 0}) == now + timedelta(
        hours=1
    )


def test_next_run_is_soon_after_a_skipped_run():
    now = datetime(2026, 11, 15, 12, 0)
    assert scheduler.next_run_after(now, {"skipped": True}) == now + timedelta(minutes=15)


def test_initial_run_catches_up_when_the_feed_is_stale(monkeypatch):
    now = datetime(2026, 11, 15, 12, 0)
    monkeypatch.setattr(scheduler, "_latest_event_time", lambda: now - timedelta(days=5))
    assert scheduler.initial_next_run(now) < now


def test_initial_run_waits_when_the_last_event_is_recent(monkeypatch):
    now = datetime(2026, 11, 15, 12, 0)
    monkeypatch.setattr(scheduler, "_latest_event_time", lambda: now - timedelta(hours=1))
    assert scheduler.initial_next_run(now) == now + timedelta(hours=3)


def test_initial_run_happens_immediately_on_an_empty_database(monkeypatch):
    now = datetime(2026, 11, 15, 12, 0)
    monkeypatch.setattr(scheduler, "_latest_event_time", lambda: None)
    assert scheduler.initial_next_run(now) == now


def test_scheduler_prunes_once_per_day_after_midnight():
    midnight = datetime(2026, 11, 15, 0, 10)
    today = date(2026, 11, 15)

    assert "pruning" in scheduler.due_tasks(midnight, midnight, None, today)
    assert "pruning" not in scheduler.due_tasks(midnight, midnight, today, today)


def test_scheduler_sends_the_digest_once_in_the_nine_oclock_hour():
    nine_am = datetime(2026, 11, 15, 9, 30)
    today = date(2026, 11, 15)

    assert "digest" in scheduler.due_tasks(nine_am, nine_am, today, None)
    assert "digest" not in scheduler.due_tasks(nine_am, nine_am, today, today)


def test_scheduler_never_starts_during_tests():
    assert scheduler.enabled() is False
    assert scheduler.start_once() is False


def test_scheduler_elects_a_single_owner_per_host():
    """Two Gunicorn workers must not ingest the same article concurrently."""
    assert scheduler.holds_election() is True
    assert scheduler.holds_election() is True


def test_freshness_window_is_configurable():
    """The Java port hard-coded 24h, which starves feeds that publish weekly."""
    now = datetime(2026, 11, 15, 12, 0)
    published = now - timedelta(hours=30)

    assert is_eligible("Kubernetes patch", "security release", published, now) is False
    assert (
        is_eligible(
            "Kubernetes patch", "security release", published, now, max_age_hours=48
        )
        is True
    )


def test_entries_slightly_ahead_of_the_clock_are_accepted():
    now = datetime(2026, 11, 15, 12, 0)
    assert is_eligible("Rust compiler", "new release", now + timedelta(minutes=1), now)
