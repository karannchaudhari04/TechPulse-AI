# Performance and Benchmarking

This document describes the performance-oriented parts of the Django backend and the reporting endpoint that exists for synthetic benchmark output.

---

## 1. Runtime Characteristics

- **Keyset feed pagination** avoids deep offset scans. Pages are ordered by `fetched_at DESC, id DESC` and use the encoded cursor as a range predicate.
- **Feed-page caching** stores ordered event IDs in Redis for 60 seconds.
- **Topic-count caching** stores entity counts for 5 minutes.
- **Trend and global-count caches** reduce repeated aggregate queries.
- **Read replica routing** sends model reads to TiDB replica connections when `DATABASE_REPLICA_URL` is configured.
- **Parallel RSS collection** uses `DISCOVERY_THREAD_POOL_SIZE` workers (default 10).
- **Bounded synthesis** processes at most `NEWS_MAX_ARTICLES_PER_INGESTION` articles per run (default 20) with a 2-second pause between Gemini calls.
- **Per-source selection cap** prevents one high-volume feed from dominating a run.
- **Celery worker concurrency** is controlled by `CELERY_WORKER_CONCURRENCY` (default 2 in Docker Compose).

Redis is treated as an optimization: cache failures fall back to database reads and do not fail public traffic.

---

## 2. Synthetic Benchmark Endpoint

The admin-only endpoint:

```text
GET /api/v1/admin/news/run-benchmarks?mode=SYNTHETIC&size=100&concurrency=2
```

calls `ingestion.services.run_benchmark`, which returns a report containing:

- `timestamp`, `mode`, `datasetSize`, `concurrency`
- `cleaningTimeMs`, `duplicateDetectionTimeMs`, `aiSynthesisTimeMs`
- `totalProcessingTimeMs`, `processingRatePerSec`
- `processedCount`, `cleanedCount`, `duplicatesDetected`
- `totalBenchmarkTimeMs`

**Important:** this endpoint produces synthetic estimates, not measured pipeline timings. It computes values from the requested dataset size (for example, 2 ms per item for cleaning and 18 ms per item for AI synthesis) and writes the report to `target/benchmarks` as JSON and CSV. It does not call RSS sources, Gemini, TiDB, or Celery.

Use it to validate report generation and client/admin contracts, not to claim production throughput.

---

## 3. What to Measure in a Real Benchmark

A realistic load test should record:

1. RSS fetch latency and failure rate per source.
2. Discovery time with the configured thread pool.
3. The cost of the 7-day near-duplicate comparison set.
4. Gemini latency, token usage, and fallback rate.
5. Database write time for `RawIngestion` and `TechnologyEvent`.
6. Feed query latency with and without Redis.
7. Celery queue depth and worker utilisation.
8. Memory use during large ingestion runs.

Run these against staging infrastructure with production-like TiDB and Redis, not against the synthetic endpoint.

---

## 4. Scaling Considerations

- **Deduplication**: the near-duplicate check compares each candidate against recent rows and is quadratic in the comparison set. As `raw_ingestion` grows, partition by `fetched_at`, narrow the window, or move candidate lookup into indexed hash/vector queries.
- **Synthesis**: Gemini is the dominant external latency and quota risk. Keep the bounded article count and model fallback chain in place, and monitor cooldowns.
- **Feed reads**: keep the keyset index and cached first pages; avoid adding offset pagination.
- **Raw storage**: the midnight pruning task keeps the staging table compact, but TiDB partitioning is still recommended at large scale.
- **API instances**: rate-limit counters use Redis when available; the in-memory fallback is per process, so multi-instance deployments should keep Redis healthy.

Detailed schema indexes are covered in [Database.md](Database.md).
