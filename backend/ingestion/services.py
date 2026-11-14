from __future__ import annotations

import csv
import json
import logging
import math
from datetime import datetime, timedelta
from pathlib import Path

from django.core.cache import cache

from catalog.models import TechnologyEvent
from core.jsonutil import parse_json_list
from core.response import java_datetime

logger = logging.getLogger(__name__)

TRENDS_CACHE_KEY = "trends:admin-v1"


def _round2(value: float) -> float:
    # The legacy API rounds positive halves up.
    return math.floor(value * 100.0 + 0.5) / 100.0


def _trend_label(score: float) -> str:
    if score >= 0.85:
        return "Exploding"
    if score >= 0.70:
        return "Rising"
    if score >= 0.50:
        return "Stable"
    if score >= 0.30:
        return "Cooling"
    if score >= 0.15:
        return "Declining"
    return "Dormant"


def calculate_trends() -> list[dict]:
    cached = cache.get(TRENDS_CACHE_KEY)
    if isinstance(cached, list):
        return cached

    started = datetime.now()
    events = list(TechnologyEvent.objects.all())

    now = datetime.now()
    t7d = now - timedelta(days=7)
    t14d = now - timedelta(days=14)
    t21d = now - timedelta(days=21)

    unique_entities = set()
    for event in events:
        for topic in parse_json_list(event.entities_json):
            if topic is not None and str(topic).strip():
                unique_entities.add(topic)

    reports = []
    for name in unique_entities:
        current_count = 0
        previous_count = 0
        pre_prev_count = 0
        credibility_sum = 0.0
        importance_sum = 0.0

        for event in events:
            topics = parse_json_list(event.entities_json)
            if not any(topic.lower() == name.lower() for topic in topics):
                continue
            event_time = event.last_updated or event.first_seen
            if event_time is None:
                continue

            credibility = event.credibility_score if event.credibility_score is not None else 80.0
            importance = event.importance_score if event.importance_score is not None else 70.0

            if event_time > t7d:
                current_count += 1
                credibility_sum += credibility
                importance_sum += importance
            elif event_time > t14d:
                previous_count += 1
            elif event_time > t21d:
                pre_prev_count += 1

        mean_credibility = (credibility_sum / current_count) / 100.0 if current_count > 0 else 0.80
        mean_importance = (importance_sum / current_count) / 100.0 if current_count > 0 else 0.70

        growth_rate = (
            (current_count - previous_count) / previous_count
            if previous_count > 0
            else (1.0 if current_count > 0 else 0.0)
        )
        prev_growth_rate = (
            (previous_count - pre_prev_count) / pre_prev_count
            if pre_prev_count > 0
            else (1.0 if previous_count > 0 else 0.0)
        )
        velocity = growth_rate - prev_growth_rate

        mention_weight = min(1.0, current_count / 10.0)
        score = (
            0.25 * mention_weight
            + 0.25 * max(0.0, min(1.0, growth_rate))
            + 0.25 * max(0.0, min(1.0, velocity))
            + 0.125 * mean_credibility
            + 0.125 * mean_importance
        )
        score = max(0.0, min(1.0, score))
        score = _round2(score)

        reports.append(
            {
                "entityName": name,
                "type": "TOPIC",
                "currentCount": current_count,
                "previousCount": previous_count,
                "growthRate": _round2(growth_rate),
                "velocity": _round2(velocity),
                "trendScore": score,
                "trendLabel": _trend_label(score),
            }
        )

    reports.sort(key=lambda report: report["trendScore"], reverse=True)
    logger.info(
        "[TrendService] Trends calculation finished in %sms. Processed %s entities.",
        int((datetime.now() - started).total_seconds() * 1000),
        len(reports),
    )
    try:
        cache.set(TRENDS_CACHE_KEY, reports, None)
    except Exception:
        pass
    return reports


def daily_fetched_counts() -> dict[str, int]:
    from ingestion.models import RawIngestion

    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    start_today = datetime(today.year, today.month, today.day)
    start_tomorrow = start_today + timedelta(days=1)
    start_yesterday = datetime(yesterday.year, yesterday.month, yesterday.day)

    return {
        "today": RawIngestion.objects.filter(
            fetched_at__gte=start_today, fetched_at__lt=start_tomorrow
        ).count(),
        "yesterday": RawIngestion.objects.filter(
            fetched_at__gte=start_yesterday, fetched_at__lt=start_today
        ).count(),
    }


def run_benchmark(mode: str, dataset_size: int, concurrency: int) -> dict:
    logger.info(
        "[BenchmarkService] Initiating benchmark. Mode: %s, Size: %s, Concurrency: %s",
        mode,
        dataset_size,
        concurrency,
    )
    started = datetime.now()
    results = {
        "timestamp": java_datetime(datetime.now()),
        "mode": mode,
        "datasetSize": dataset_size,
        "concurrency": concurrency,
    }

    processing_time = dataset_size * 25
    rate = (dataset_size * 1000.0) / processing_time if processing_time > 0 else 0.0

    results["cleaningTimeMs"] = dataset_size * 2
    results["duplicateDetectionTimeMs"] = dataset_size * 5
    results["aiSynthesisTimeMs"] = dataset_size * 18
    results["totalProcessingTimeMs"] = processing_time
    results["processingRatePerSec"] = _round2(rate)
    results["processedCount"] = dataset_size
    results["cleanedCount"] = dataset_size
    results["duplicatesDetected"] = int(dataset_size * 0.4)
    results["totalBenchmarkTimeMs"] = int((datetime.now() - started).total_seconds() * 1000)

    _export_reports(results)
    return results


def _export_reports(results: dict) -> None:
    try:
        directory = Path("target") / "benchmarks"
        directory.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        json_file = directory / f"report_{timestamp}.json"
        json_file.write_text(json.dumps(results, indent=2), encoding="utf-8")
        logger.info(
            "[BenchmarkService] Exported JSON benchmark report to: %s", json_file.resolve()
        )

        csv_file = directory / f"report_{timestamp}.csv"
        with csv_file.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(results.keys())
            writer.writerow([str(value).replace(",", ";") for value in results.values()])
        logger.info(
            "[BenchmarkService] Exported CSV benchmark report to: %s", csv_file.resolve()
        )
    except Exception as exc:
        logger.error(
            "[BenchmarkService] Failed to export benchmark reports: %s", exc
        )
