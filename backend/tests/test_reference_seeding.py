from __future__ import annotations

from io import StringIO

import pytest
from django.core.management import call_command

from accounts.models import Category
from ingestion.management.commands.seed_reference_data import (
    DEFAULT_CATEGORIES,
    DEFAULT_SOURCES,
)
from ingestion.models import NewsSource

pytestmark = pytest.mark.django_db


def run_seeder(*args: str) -> str:
    out = StringIO()
    call_command("seed_reference_data", *args, stdout=out)
    return out.getvalue()


def test_seeder_creates_the_sources_and_categories_the_pipeline_needs():
    """The Java backend seeded these on startup; without them discovery is a no-op."""
    run_seeder()

    assert NewsSource.objects.count() == len(DEFAULT_SOURCES)
    assert NewsSource.objects.filter(active=True).count() == len(DEFAULT_SOURCES)
    assert Category.objects.count() == len(DEFAULT_CATEGORIES)


def test_seeder_is_idempotent():
    run_seeder()
    output = run_seeder()

    assert NewsSource.objects.count() == len(DEFAULT_SOURCES)
    assert Category.objects.count() == len(DEFAULT_CATEGORIES)
    assert "created 0" in output


def test_seeder_keeps_existing_sources_and_their_state():
    NewsSource.objects.create(
        url=DEFAULT_SOURCES[0][1], name="Renamed by an admin", active=False
    )

    run_seeder()

    source = NewsSource.objects.get(url=DEFAULT_SOURCES[0][1])
    assert source.name == "Renamed by an admin"
    assert source.active is False
    assert NewsSource.objects.count() == len(DEFAULT_SOURCES)


def test_seeder_dry_run_writes_nothing():
    output = run_seeder("--dry-run")

    assert NewsSource.objects.count() == 0
    assert Category.objects.count() == 0
    assert "Dry run" in output


def test_dry_run_ingest_reports_sources_without_saving(monkeypatch):
    from ingestion.agents import rss

    NewsSource.objects.create(
        url="https://example.com/feed", name="Example", active=True
    )
    monkeypatch.setattr(rss, "collect", lambda name, url: [])

    out = StringIO()
    call_command("ingest_news", "--dry-run", stdout=out)

    assert "Example" in out.getvalue()
    assert "No database writes" in out.getvalue()
