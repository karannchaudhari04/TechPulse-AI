from __future__ import annotations

import threading
from datetime import date, datetime, timedelta
from types import SimpleNamespace

import pytest
from django.core.cache import cache
from django.test import Client, RequestFactory

from accounts.models import UserAccount
from core import diagnostics, scheduler
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

    def fake_run(**kwargs):
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
    cache.delete(tasks.RUNS_CACHE_KEY)
    monkeypatch.setattr(tasks.cache, "add", lambda *args, **kwargs: True)
    monkeypatch.setattr(tasks, "discover_and_deduplicate", list)
    monkeypatch.setattr(tasks.RawIngestion.objects, "exclude", lambda *a, **k: _NoRows())

    assert tasks.ingest_all_feeds() == {"saved": 0, "candidates": 0}

    last_run = cache.get(tasks.LAST_RUN_CACHE_KEY)
    assert last_run["saved"] == 0
    assert last_run["candidates"] == 0
    assert last_run["at"]

    history = tasks.recent_runs()
    assert history[0]["kind"] == "run"
    assert history[0]["trigger"] == "manual"
    assert history[0]["saved"] == 0


def test_run_history_keeps_the_newest_entries():
    cache.delete(tasks.RUNS_CACHE_KEY)
    for index in range(tasks.RUNS_MAX + 5):
        tasks.record_run_event({"kind": "test", "index": index})

    history = tasks.recent_runs()
    assert len(history) == tasks.RUNS_MAX
    assert history[0]["index"] == tasks.RUNS_MAX + 4


def test_scheduler_records_why_it_ran():
    cache.delete(tasks.RUNS_CACHE_KEY)

    scheduler._record_scheduler_decision("boundary", datetime(2026, 11, 17, 16, 0))

    entry = tasks.recent_runs()[0]
    assert entry["kind"] == "decision"
    assert entry["trigger"] == "scheduler"
    assert entry["reason"] == "boundary"
    assert entry["dueAt"] == "2026-11-17T16:00:00"


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


def test_next_run_after_a_productive_run_is_the_next_clock_boundary():
    """Java's @Scheduled(cron) is fixed-clock: success does not shift the time."""
    now = datetime(2026, 11, 15, 12, 0)
    assert scheduler.next_run_after(now, {"saved": 3, "candidates": 5}) == datetime(
        2026, 11, 15, 16, 0
    )


def test_next_run_after_an_empty_run_is_still_the_next_clock_boundary():
    now = datetime(2026, 11, 15, 12, 0)
    assert scheduler.next_run_after(now, {"saved": 0, "candidates": 0}) == datetime(
        2026, 11, 15, 16, 0
    )


def test_next_run_after_a_skipped_run_is_soon():
    now = datetime(2026, 11, 15, 12, 0)
    assert scheduler.next_run_after(now, {"skipped": True}) == now + timedelta(minutes=15)


def test_schedule_defaults_to_cron_every_eight_hours(monkeypatch):
    monkeypatch.delenv("INGESTION_SCHEDULE_HOURS", raising=False)

    assert scheduler.schedule_hours() == 8
    assert scheduler.schedule_cron() == "0 0 */8 * * *"


def test_schedule_hours_can_restore_the_java_four_hour_cadence(monkeypatch):
    monkeypatch.setenv("INGESTION_SCHEDULE_HOURS", "4")

    assert scheduler.schedule_cron() == "0 0 */4 * * *"
    assert scheduler.next_scheduled_boundary(datetime(2026, 11, 15, 12, 0)) == datetime(
        2026, 11, 15, 16, 0
    )


def test_schedule_hours_fall_back_when_the_env_value_is_invalid(monkeypatch):
    monkeypatch.setenv("INGESTION_SCHEDULE_HOURS", "not-a-number")
    assert scheduler.schedule_hours() == 8

    monkeypatch.setenv("INGESTION_SCHEDULE_HOURS", "0")
    assert scheduler.schedule_hours() == 8


def test_scheduled_boundaries_are_minute_zero_of_the_configured_hours(monkeypatch):
    monkeypatch.setenv("INGESTION_SCHEDULE_HOURS", "8")
    now = datetime(2026, 11, 15, 9, 37, 12)

    assert scheduler.last_scheduled_boundary(now) == datetime(2026, 11, 15, 8, 0)
    assert scheduler.next_scheduled_boundary(now) == datetime(2026, 11, 15, 16, 0)

    # Exactly on a boundary: next is the following one, last is this one.
    on_boundary = datetime(2026, 11, 15, 16, 0)
    assert scheduler.last_scheduled_boundary(on_boundary) == on_boundary
    assert scheduler.next_scheduled_boundary(on_boundary) == datetime(2026, 11, 16, 0, 0)


def test_a_daily_schedule_fires_at_midnight(monkeypatch):
    monkeypatch.setenv("INGESTION_SCHEDULE_HOURS", "24")
    now = datetime(2026, 11, 15, 12, 0)

    assert scheduler.last_scheduled_boundary(now) == datetime(2026, 11, 15, 0, 0)
    assert scheduler.next_scheduled_boundary(now) == datetime(2026, 11, 16, 0, 0)


def test_initial_run_catches_up_when_a_boundary_passed_while_asleep(monkeypatch):
    """Boot at 09:00 with the last run at 04:00: the 08:00 boundary was missed."""
    now = datetime(2026, 11, 15, 9, 0)
    monkeypatch.setattr(
        scheduler, "_last_activity_time", lambda: datetime(2026, 11, 15, 4, 0)
    )

    assert scheduler.initial_next_run(now) == now


def test_initial_run_waits_for_the_next_boundary_when_the_last_run_is_current(monkeypatch):
    now = datetime(2026, 11, 15, 9, 0)
    monkeypatch.setattr(
        scheduler, "_last_activity_time", lambda: datetime(2026, 11, 15, 8, 1)
    )

    assert scheduler.initial_next_run(now) == datetime(2026, 11, 15, 16, 0)


def test_initial_run_reads_the_last_run_timestamp_from_the_cache():
    """A manual run an hour ago must not be repeated, but a missed boundary must be."""
    cache.set(
        tasks.LAST_RUN_CACHE_KEY,
        {"at": "2026-11-15T04:00:00", "saved": 2, "candidates": 3},
        timeout=60,
    )
    assert scheduler.initial_next_run(datetime(2026, 11, 15, 9, 0)) == datetime(
        2026, 11, 15, 9, 0
    )

    cache.set(
        tasks.LAST_RUN_CACHE_KEY,
        {"at": "2026-11-15T08:05:00", "saved": 2, "candidates": 3},
        timeout=60,
    )
    assert scheduler.initial_next_run(datetime(2026, 11, 15, 9, 0)) == datetime(
        2026, 11, 15, 16, 0
    )


def test_initial_run_retries_after_a_failed_or_skipped_run():
    """A 0.0s failure is not fresh data, so boot must catch up immediately."""
    now = datetime(2026, 11, 15, 9, 30)
    for outcome in ({"error": "(0, '')"}, {"skipped": True}):
        cache.set(
            tasks.LAST_RUN_CACHE_KEY,
            {"at": "2026-11-15T09:06:00", "trigger": "scheduler", **outcome},
            timeout=60,
        )
        assert scheduler.initial_next_run(now) == now


def test_initial_run_happens_immediately_on_an_empty_database(monkeypatch):
    now = datetime(2026, 11, 15, 12, 0)
    monkeypatch.setattr(scheduler, "_last_activity_time", lambda: None)
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


def test_scheduler_restarts_a_thread_that_died(monkeypatch):
    started = []

    class DeadThread:
        def is_alive(self):
            return False

    class FakeThread:
        def __init__(self, *args, **kwargs):
            pass

        def start(self):
            started.append(True)

        def is_alive(self):
            return False

    monkeypatch.setattr(scheduler, "enabled", lambda: True)
    monkeypatch.setattr(scheduler, "_publish_state", lambda **kwargs: {})
    monkeypatch.setattr(scheduler, "_thread", DeadThread())
    monkeypatch.setattr(scheduler.threading, "Thread", FakeThread)

    assert scheduler.start_once() is True
    assert started == [True]


def test_scheduler_does_not_start_a_second_thread_while_one_is_alive(monkeypatch):
    monkeypatch.setattr(scheduler, "enabled", lambda: True)
    monkeypatch.setattr(scheduler, "_thread", SimpleNamespace(is_alive=lambda: True))

    assert scheduler.start_once() is False


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


def test_admin_health_reports_the_scheduler_component():
    response = admin_client("admin-health-scheduler").get("/api/v1/admin/news/health")

    assert response.status_code == 200
    assert "scheduler" in response.json()["components"]


def test_scheduler_state_exposes_the_heartbeat_and_next_run():
    cache.delete(scheduler.STATE_CACHE_KEY)
    scheduler._publish_state(
        startedAt="2026-11-16T09:00:00",
        elected=True,
        nextIngestAt="2026-11-16T16:50:00",
        lastTickAt="2026-11-16T09:00:00",
    )

    state = scheduler.state()

    assert state["enabled"] is False  # tests never start the scheduler
    assert state["elected"] is True
    assert state["nextIngestAt"] == "2026-11-16T16:50:00"
    assert isinstance(state["heartbeatAgeSeconds"], float)
    assert state["tickSeconds"] == scheduler.TICK_SECONDS
    assert state["scheduleCron"] == "0 0 */8 * * *"


def test_scheduler_health_reports_a_stale_heartbeat_as_down(monkeypatch):
    monkeypatch.setattr(scheduler, "enabled", lambda: True)
    monkeypatch.setattr(
        scheduler,
        "state",
        lambda: {
            "startedAt": "2026-11-16T09:00:00",
            "updatedAt": "2026-11-16T09:00:00",
            "heartbeatAgeSeconds": 3600.0,
            "tickSeconds": 60,
        },
    )

    assert views._scheduler_status().startswith("DOWN")


def test_scheduler_health_reports_an_up_heartbeat(monkeypatch):
    monkeypatch.setattr(scheduler, "enabled", lambda: True)
    monkeypatch.setattr(
        scheduler,
        "state",
        lambda: {
            "startedAt": "2026-11-16T09:00:00",
            "updatedAt": "2026-11-16T09:00:30",
            "heartbeatAgeSeconds": 12.0,
            "tickSeconds": 60,
            "elected": True,
            "nextIngestAt": "2026-11-16T16:50:00",
        },
    )

    component = views._scheduler_status()

    assert component.startswith("UP")
    assert "2026-11-16T16:50:00" in component


def test_internal_ingest_is_hidden_when_no_token_is_configured(monkeypatch):
    monkeypatch.delenv("INGEST_TRIGGER_TOKEN", raising=False)

    response = Client().get("/internal/ingest")

    assert response.status_code == 404


def test_internal_ingest_rejects_a_wrong_token(monkeypatch):
    monkeypatch.setenv("INGEST_TRIGGER_TOKEN", "cron-secret")

    response = Client().get("/internal/ingest", HTTP_X_INGEST_TOKEN="not-the-secret")

    assert response.status_code == 403
    assert response.json()["success"] is False


def test_internal_ingest_starts_a_background_run(monkeypatch):
    monkeypatch.setenv("INGEST_TRIGGER_TOKEN", "cron-secret")
    started = []
    monkeypatch.setattr(
        "ingestion.views._start_background_run", lambda **kwargs: started.append(kwargs)
    )

    response = Client().post("/internal/ingest", HTTP_X_INGEST_TOKEN="cron-secret")

    assert response.status_code == 200
    assert response.json()["data"] == {"mode": "background"}
    assert started == [{"trigger": "cron"}]


def test_internal_ingest_sync_returns_the_run_result(monkeypatch):
    monkeypatch.setenv("INGEST_TRIGGER_TOKEN", "cron-secret")
    monkeypatch.setattr(
        "ingestion.views.ingest_all_feeds", lambda **kwargs: {"saved": 4, "candidates": 6}
    )

    response = Client().get(
        "/internal/ingest?sync=true", HTTP_X_INGEST_TOKEN="cron-secret"
    )

    assert response.status_code == 200
    assert response.json()["data"] == {"saved": 4, "candidates": 6}


def _request_for(path="/actuator/health", user_agent="UptimeRobot/2.0"):
    return RequestFactory().get(path, HTTP_USER_AGENT=user_agent)


def test_diagnostics_records_a_monitor_sighting():
    cache.delete(diagnostics.CACHE_KEY)
    diagnostics._last_recorded.clear()

    diagnostics.record_request(
        _request_for(), SimpleNamespace(status_code=200)
    )

    recent = diagnostics.recent_requests()
    assert recent[0]["path"] == "/actuator/health"
    assert recent[0]["userAgent"] == "UptimeRobot/2.0"
    assert recent[0]["status"] == 200
    assert recent[0]["probe"] is True


def test_diagnostics_throttles_repeated_sightings():
    cache.delete(diagnostics.CACHE_KEY)
    diagnostics._last_recorded.clear()
    request = _request_for()

    diagnostics.record_request(request)
    diagnostics.record_request(request)

    assert len(diagnostics.recent_requests()) == 1


def test_diagnostics_does_not_record_the_status_page_itself():
    cache.delete(diagnostics.CACHE_KEY)
    diagnostics._last_recorded.clear()

    diagnostics.record_request(_request_for("/status"))

    assert diagnostics.recent_requests() == []


def test_diagnostics_hides_status_entries_written_by_older_builds():
    cache.set(
        diagnostics.CACHE_KEY,
        [{"path": "/status"}, {"path": "/actuator/health"}],
        timeout=60,
    )

    assert [entry["path"] for entry in diagnostics.recent_requests()] == [
        "/actuator/health"
    ]


def test_status_is_public_and_reports_the_scheduler(monkeypatch):
    monkeypatch.setenv("INGEST_TRIGGER_TOKEN", "cron-secret")
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc1234")
    monkeypatch.delenv("INGESTION_SCHEDULE_HOURS", raising=False)
    cache.delete(scheduler.STATE_CACHE_KEY)
    scheduler._publish_state(elected=True, nextIngestAt="2026-11-17T16:00:00")

    response = Client().get("/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["commit"] == "abc1234"
    assert payload["ingestTriggerTokenConfigured"] is True
    assert payload["scheduler"]["elected"] is True
    assert payload["scheduler"]["scheduleCron"] == "0 0 */8 * * *"
    assert payload["scheduler"]["nextIngestAt"] == "2026-11-17T16:00:00"
    assert payload["database"]["status"] == "UP"
    assert isinstance(payload["requests"], list)
    assert isinstance(payload["recentRuns"], list)


def test_status_reports_the_last_run_and_an_unconfigured_hook(monkeypatch):
    monkeypatch.delenv("INGEST_TRIGGER_TOKEN", raising=False)
    cache.set(
        tasks.LAST_RUN_CACHE_KEY,
        {"at": "2026-11-17T08:00:30", "trigger": "scheduler", "saved": 1, "candidates": 2},
        timeout=60,
    )

    payload = Client().get("/status").json()

    assert payload["lastRun"]["trigger"] == "scheduler"
    assert payload["ingestTriggerTokenConfigured"] is False


def test_status_head_has_no_body():
    response = Client().head("/status")

    assert response.status_code == 200
    assert response.content == b""
