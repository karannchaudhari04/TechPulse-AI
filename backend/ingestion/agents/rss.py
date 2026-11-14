from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import datetime

import feedparser
import requests

from ingestion.agents.common import text_content, utc_struct_to_local_datetime
from ingestion.agents.text import is_eligible

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 3
RETRY_BACKOFF_SECONDS = 1


@dataclass
class RawUpdate:
    title: str
    raw_content: str
    source_url: str
    author: str | None
    published_at: datetime | None
    source_type: str
    source_name: str
    fetched_at: datetime
    canonical_url: str
    language: str


def collect(source_name: str, source_url: str) -> list[RawUpdate]:
    logger.info("[RssCollector] Starting collection from source '%s' (%s)", source_name, source_url)
    feed = None
    last_error: Exception | None = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = requests.get(
                source_url,
                headers={"User-Agent": "TechPulse-News-Bot/1.0"},
                timeout=(10, 10),
            )
            if not response.ok:
                response.raise_for_status()
            feed = feedparser.parse(response.content)
            logger.info(
                "[RssCollector] Successfully fetched feed '%s' on attempt %s/%s",
                source_name,
                attempt,
                MAX_ATTEMPTS,
            )
            break
        except Exception as exc:
            last_error = exc
            logger.warning(
                "[RssCollector] Attempt %s/%s failed for '%s': %s",
                attempt,
                MAX_ATTEMPTS,
                source_name,
                exc,
            )
            if attempt < MAX_ATTEMPTS:
                time.sleep(RETRY_BACKOFF_SECONDS)

    if feed is None:
        raise RuntimeError(
            f"Failed to collect RSS feed after {MAX_ATTEMPTS} attempts: {last_error}"
        )

    language = (feed.feed or {}).get("language") or "en"
    now = datetime.now()
    raw_updates: list[RawUpdate] = []
    rejected_count = 0

    for entry in feed.entries:
        try:
            published_at = utc_struct_to_local_datetime(entry.get("published_parsed"))
            if published_at is None:
                rejected_count += 1
                continue
            content = _entry_text(entry)
            if not is_eligible(entry.get("title"), content, published_at, now):
                rejected_count += 1
                continue
            update = _map_entry(entry, source_name, language, published_at, content)
            if update is not None:
                raw_updates.append(update)
                if len(raw_updates) == 8:
                    break
        except Exception as exc:
            logger.warning(
                "[RssCollector] Error mapping entry in feed '%s': %s", source_name, exc
            )

    logger.info(
        "[RssCollector] Completed collection from source '%s'. Accepted %s recent "
        "software-engineering entries; rejected %s entries outside the 24-hour/relevance rules.",
        source_name,
        len(raw_updates),
        rejected_count,
    )
    return raw_updates


def _entry_text(entry) -> str:
    html = ""
    if entry.get("summary"):
        html = entry.get("summary") or ""
    elif entry.get("content"):
        html = (entry.get("content") or [{}])[0].get("value") or ""
    return text_content(html)


def _map_entry(entry, source_name, language, published_at, content) -> RawUpdate | None:
    source_url = entry.get("link")
    if not source_url or not str(source_url).strip():
        return None
    title = (entry.get("title") or "").strip()
    if not title:
        return None
    if not content.strip():
        return None

    author = (entry.get("author") or "").strip() or None
    return RawUpdate(
        title=title,
        raw_content=content,
        source_url=source_url,
        author=author,
        published_at=published_at,
        source_type="RSS",
        source_name=source_name,
        fetched_at=datetime.now(),
        canonical_url=source_url,
        language=language,
    )
