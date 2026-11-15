from __future__ import annotations

import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

from django.conf import settings
from django.db import transaction

from ingestion.agents import rss
from ingestion.agents.common import (
    clean_html,
    has_token_overlap,
    normalize_title,
    sha256,
)
from ingestion.agents.text import is_eligible, jaro_winkler, select_top_articles
from ingestion.agents.urls import normalize
from ingestion.models import NewsSource, RawIngestion

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.85


def discover_and_deduplicate() -> list[RawIngestion]:
    run_id = str(uuid.uuid4())
    started = datetime.now()
    logger.info("[DiscoveryAgent] Starting discovery run ID: %s", run_id)

    active_sources = list(NewsSource.objects.filter(active=True))
    logger.info("[DiscoveryAgent] Found %s active sources", len(active_sources))

    raw_updates = []
    successful_sources = 0
    failed_sources = 0

    def _collect(source):
        return rss.collect(source.name, source.url)

    thread_pool_size = max(1, int(getattr(settings, "DISCOVERY_THREAD_POOL_SIZE", 10)))
    if active_sources:
        with ThreadPoolExecutor(max_workers=thread_pool_size) as executor:
            futures = [executor.submit(_collect, source) for source in active_sources]
            for source, future in zip(active_sources, futures):
                try:
                    raw_updates.extend(future.result())
                    successful_sources += 1
                except Exception as exc:
                    failed_sources += 1
                    logger.error(
                        "[DiscoveryAgent] Failed fetching feed %s: %s", source.name, exc
                    )

    logger.info("[DiscoveryAgent] Fetched %s total candidate updates", len(raw_updates))

    since = datetime.now() - timedelta(days=7)
    db_candidates = list(
        RawIngestion.objects.filter(fetched_at__gte=since).values(
            "title", "published_at", "fetched_at", "event_id"
        )
    )

    unique_updates: list[RawIngestion] = []
    duplicate_count = 0
    rejected_count = 0
    eligibility_now = datetime.now()

    for update in raw_updates:
        if not is_eligible(
            update.title,
            update.raw_content,
            update.published_at,
            eligibility_now,
            max_age_hours=settings.NEWS_FRESHNESS_HOURS,
        ):
            rejected_count += 1
            continue

        if not update.title.strip() or not update.source_url.strip():
            continue

        cleaned_title = clean_html(update.title)
        cleaned_content = clean_html(update.raw_content)
        if not cleaned_title.strip() or not cleaned_content.strip():
            continue

        normalized_url = normalize(update.source_url)
        canonical_url = normalize(update.canonical_url or update.source_url)
        url_hash = sha256(canonical_url)
        title_hash = sha256(normalize_title(cleaned_title))

        is_duplicate = False
        matched_event_id = None

        for existing in unique_updates:
            if existing.url_hash == url_hash or existing.title_hash == title_hash:
                is_duplicate = True
                matched_event_id = existing.event_id
                break

        if not is_duplicate:
            match = RawIngestion.objects.filter(url_hash=url_hash).first()
            if match is not None:
                is_duplicate = True
                matched_event_id = match.event_id

        if not is_duplicate:
            match = RawIngestion.objects.filter(title_hash=title_hash).first()
            if match is not None:
                is_duplicate = True
                matched_event_id = match.event_id

        if not is_duplicate:
            published_time = update.published_at or datetime.now()
            for candidate in db_candidates:
                candidate_published = candidate.get("published_at") or candidate.get("fetched_at")
                if candidate_published is None:
                    continue
                hour_diff = abs(int((published_time - candidate_published).total_seconds() // 3600))
                if hour_diff <= 48 and has_token_overlap(cleaned_title, candidate.get("title")):
                    similarity = jaro_winkler(cleaned_title, candidate.get("title"))
                    if similarity >= SIMILARITY_THRESHOLD:
                        is_duplicate = True
                        matched_event_id = candidate.get("event_id")
                        break

        if is_duplicate:
            duplicate_count += 1
            logger.debug(
                "[DiscoveryAgent] Duplicate detected and discarded: '%s' (Matched Event ID: %s)",
                cleaned_title,
                matched_event_id,
            )
            continue

        entity = RawIngestion(
            id=str(uuid.uuid4()),
            run_id=run_id,
            source_name=update.source_name,
            source_type=update.source_type,
            title=cleaned_title,
            raw_content=cleaned_content,
            url=normalized_url,
            canonical_url=canonical_url,
            url_hash=url_hash,
            title_hash=title_hash,
            published_at=update.published_at,
            fetched_at=update.fetched_at or datetime.now(),
            processing_status="NEW",
            event_id=str(uuid.uuid4()),
        )
        unique_updates.append(entity)
        logger.info(
            "[DiscoveryAgent] Unique article discovered: '%s' (Event ID: %s)",
            cleaned_title,
            entity.event_id,
        )

    max_articles = max(1, int(getattr(settings, "NEWS_MAX_ARTICLES_PER_INGESTION", 20)))
    selected_updates = select_top_articles(unique_updates, max_articles)
    ranked_out_count = len(unique_updates) - len(selected_updates)
    unique_updates = selected_updates
    logger.info(
        "[DiscoveryAgent] Quality ranking selected %s articles (limit=%s); ranked out %s candidates.",
        len(unique_updates),
        max_articles,
        ranked_out_count,
    )

    if unique_updates:
        with transaction.atomic():
            RawIngestion.objects.bulk_create(unique_updates)

    duration_ms = int((datetime.now() - started).total_seconds() * 1000)
    logger.info(
        "[DISCOVERY] runId=%s sources=%s successful=%s failed=%s candidates=%s "
        "rejectedByEligibility=%s unique=%s duplicates=%s saved=%s durationMs=%s",
        run_id,
        len(active_sources),
        successful_sources,
        failed_sources,
        len(raw_updates),
        rejected_count,
        len(unique_updates),
        duplicate_count,
        len(unique_updates),
        duration_ms,
    )
    return unique_updates
