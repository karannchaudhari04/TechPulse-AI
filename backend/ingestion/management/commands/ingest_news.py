from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from ingestion.agents import rss
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
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help=(
                "Fetch every active feed and report how many entries pass the "
                "freshness/relevance rules. Writes nothing and never calls Gemini."
            ),
        )
        parser.add_argument(
            "--check-ai",
            action="store_true",
            help=(
                "Make one tiny Gemini call and report the exact result, including "
                "the provider's error text. Use this when runs save nothing."
            ),
        )

    def handle(self, *args, **options):
        if options["check_ai"]:
            self._check_ai()
            return

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
        if active_sources == 0:
            self.stdout.write(
                self.style.WARNING(
                    "No active news sources. Run `python manage.py seed_reference_data` "
                    "or add rows to news_sources."
                )
            )

        if options["dry_run"]:
            self._dry_run()
            return

        result = ingest_all_feeds()
        self.stdout.write(self.style.SUCCESS(f"Ingestion finished: {result}"))

    def _check_ai(self) -> None:
        """One minimal request: enough to prove the key, URL, and model names work."""
        from core import ai

        self.stdout.write(
            f"Gemini base URL: {settings.GEMINI_BASE_URL}\n"
            f"Primary model: {settings.GEMINI_MODEL}\n"
            f"Fallback models: {', '.join(settings.GEMINI_FALLBACK_MODELS) or '-'}\n"
            f"API key configured: {bool(settings.GEMINI_API_KEY)}"
        )
        if not settings.GEMINI_API_KEY:
            self.stdout.write(
                self.style.ERROR("GEMINI_API_KEY is empty; synthesis cannot succeed.")
            )
            return

        try:
            response = ai.generate(
                api_key=settings.GEMINI_API_KEY,
                model=settings.GEMINI_MODEL,
                temperature=0.0,
                max_tokens=32,
                system_prompt="Return strict JSON only.",
                user_prompt='Reply with this JSON and nothing else: {"ok": true}',
                request_id="ai-health-check",
            )
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"Gemini check failed: {exc}"))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Gemini replied using {response.model}: {(response.content or '')[:120]!r}"
            )
        )

    def _dry_run(self) -> None:
        """Exercise the collectors only, which is where a stalled feed usually fails."""
        sources = list(NewsSource.objects.filter(active=True))
        self.stdout.write(
            f"Dry run: collecting {len(sources)} feeds (freshness window "
            f"{settings.NEWS_FRESHNESS_HOURS}h). No database writes, no Gemini calls."
        )

        def collect(source: NewsSource):
            try:
                return source, rss.collect(source.name, source.url), None
            except Exception as exc:  # a single broken feed must not hide the rest
                return source, [], exc

        total = 0
        failures = 0
        with ThreadPoolExecutor(
            max_workers=max(1, settings.DISCOVERY_THREAD_POOL_SIZE)
        ) as executor:
            for source, updates, error in executor.map(collect, sources):
                if error is not None:
                    failures += 1
                    self.stdout.write(self.style.ERROR(f"  FAIL {source.name}: {error}"))
                    continue
                total += len(updates)
                status = "ok" if updates else "no fresh entries"
                self.stdout.write(f"  {len(updates):>2}  {source.name} ({status})")

        self.stdout.write(
            f"Dry run finished: {total} eligible entries from "
            f"{len(sources) - failures}/{len(sources)} reachable feeds."
        )
