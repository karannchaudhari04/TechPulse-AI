from __future__ import annotations

from datetime import date, datetime, timedelta

import pytest
from django.test import Client, RequestFactory

from accounts.models import UserAccount
from core import scheduler
from core.views import actuator_health
from ingestion import tasks

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


def test_trigger_ingest_reports_enqueue_failure(monkeypatch):
    class BrokenTask:
        def delay(self):
            raise ConnectionError("broker unavailable")

    monkeypatch.setattr("ingestion.views.ingest_all_feeds", BrokenTask())

    response = admin_client().post("/api/v1/admin/news/ingest")
    payload = response.json()

    assert response.status_code == 503
    assert payload["success"] is False
    assert "sync=true" in payload["message"]


def test_trigger_ingest_sync_runs_inline(monkeypatch):
    monkeypatch.setattr(
        "ingestion.views.ingest_all_feeds",
        lambda: {"saved": 2, "candidates": 3},
    )

    response = admin_client().post("/api/v1/admin/news/ingest?sync=true")
    payload = response.json()

    assert response.status_code == 200
    assert payload["data"] == {"saved": 2, "candidates": 3}


def test_actuator_health_head_has_no_body():
    response = actuator_health(RequestFactory().head("/actuator/health"))
    assert response.status_code == 200
    assert response.content == b""


def test_scheduler_runs_ingestion_when_it_has_never_run():
    now = datetime(2026, 11, 15, 12, 0)
    assert "ingestion" in scheduler.due_tasks(now, None, None, None)


def test_scheduler_waits_four_hours_between_ingestions():
    now = datetime(2026, 11, 15, 12, 0)
    today = date(2026, 11, 15)

    assert "ingestion" not in scheduler.due_tasks(
        now, now - timedelta(hours=3, minutes=59), today, today
    )
    assert "ingestion" in scheduler.due_tasks(now, now - timedelta(hours=4), today, today)


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
