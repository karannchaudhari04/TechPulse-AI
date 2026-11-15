from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from ingestion.models import NewsSource
from ingestion.tasks import ingest_all_feeds


class Command(BaseCommand):
    help = (
        "Run the news ingestion pipeline synchronously, without Celery or a "
        "broker. Suitable for cron jobs, one-off runs, and hosts where "
        "background workers are unavailable."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--max-articles",
            type=int,
            default=None,
            help="Override NEWS_MAX_ARTICLES_PER_INGESTION for this run.",
        )
        parser.add_argument(
            "--skip-if-disabled",
            action="store_true",
            help="Honour NEWS_INGESTION_ENABLED and exit without fetching.",
        )

    def handle(self, *args, **options):
        if options["skip_if_disabled"] and not settings.NEWS_INGESTION_ENABLED:
            self.stdout.write(self.style.WARNING("NEWS_INGESTION_ENABLED is false; nothing to do."))
            return

        max_articles = options["max_articles"]
        if max_articles is not None:
            if max_articles < 1:
                raise CommandError("--max-articles must be a positive integer")
            settings.NEWS_MAX_ARTICLES_PER_INGESTION = max_articles

        active_sources = NewsSource.objects.filter(active=True).count()
        self.stdout.write(f"Active news sources: {active_sources}")

        result = ingest_all_feeds()
        self.stdout.write(self.style.SUCCESS(f"Ingestion finished: {result}"))
