# Pipeline Processing and Data Flows

This document describes the Django ingestion pipeline: how RSS updates move from collection to deduplication, quality ranking, Gemini synthesis, and persistence.

---

## 1. End-to-End Flow

```mermaid
sequenceDiagram
    participant Beat as Celery beat
    participant Task as ingest_all_feeds
    participant Discovery as discover_and_deduplicate
    participant RSS as RSS collectors
    participant DB as TiDB
    participant Ranker as select_top_articles
    participant Synth as synthesize_and_save
    participant Gemini as Gemini API
    participant Cache as Redis cache

    Beat->>Task: scheduled_ingest (every 8h)
    Task->>Cache: acquire "lock:NewsIngestion.running"
    Task->>DB: delete non-PROCESSED raw rows
    Task->>Discovery: run discovery
    Discovery->>RSS: collect active sources (thread pool)
    RSS-->>Discovery: RawUpdate entries
    Discovery->>Discovery: eligibility, cleaning, URL/hash dedupe
    Discovery->>DB: load 7-day candidate titles
    Discovery->>Ranker: rank unique candidates
    Ranker-->>Discovery: top N articles
    Discovery->>DB: bulk_create RawIngestion rows (status NEW)
    Discovery-->>Task: unique candidates

    loop Each candidate
        Task->>Synth: synthesize_and_save(candidate)
        Synth->>Gemini: strict JSON synthesis request
        Gemini-->>Synth: structured event JSON
        Synth->>DB: save TechnologyEvent, mark raw PROCESSED
        alt Gemini or JSON failure
            Synth->>DB: delete failed raw row
            Synth-->>Task: raise error, pipeline continues
        end
    end

    Task->>Cache: invalidate feed/trends caches
    Task->>Cache: release running lock
```

A separate beat task, `prune_raw_ingestions`, runs at midnight.

### Seed data

The Java backend seeded `categories`, `news_sources`, and five sample events on startup. The Django port reproduces the first two through `python manage.py seed_reference_data`, which the web entrypoint runs when `SEED_REFERENCE_DATA=true`. It inserts the 23 default feeds and 11 categories only when they are missing, repairs two dead feed URLs from the Java list (`spring.io/blog.xml` → `spring.io/blog.atom`, `gadgets.ndtv.com/rss/feeds` → the FeedBurner mirror), and never overwrites a row an operator has edited beyond those repairs. It also deactivates (rather than deletes) an active source whose URL is not `http(s)` — this is how a test-fixture `file://` feed that leaked into a shared database stops failing on every run. With no active sources, discovery logs `Found 0 active sources` and the pipeline is a no-op.

### Triggering the pipeline

The pipeline entry point is `ingestion.tasks.ingest_all_feeds`. It can be started four ways:

| Trigger | Requires | Use |
|---|---|---|
| In-process scheduler (`core.scheduler`) | Database + Gemini | Default; runs on Render's free plan |
| Celery Beat → `scheduled_ingest` every 8h | Worker + broker | Production with background workers |
| `python manage.py ingest_news` | Database + Gemini only | Render cron job, one-off run, local backfill |
| `POST /api/v1/admin/news/ingest` | Admin Firebase token | Manual run or external scheduler |

The admin endpoint runs the pipeline in a daemon thread by default and returns immediately, because `REDIS_URL` makes `.delay()` succeed even when no worker is consuming the queue. `?sync=true` blocks for the result (`{"saved": N, "candidates": M}`); `?async=true` enqueues a Celery task and returns `{"taskId": ..., "mode": "celery"}`. The ingestion lock prevents overlapping background, scheduled, and manual runs.

Every run writes a summary to the `ingestion:lastRun` cache key (`at`, `startedAt`, `durationSeconds`, `saved`, `candidates`, or `error`/`skipped`), which the admin health endpoint reports under `components.pipeline`. Each summary is also prepended to the `ingestion:runs` ring (last 20 entries), together with the scheduler's decision entries (`reason=boundary`, `catch-up`, or `retry`) so `GET /status` can show whether a run was automatic or manual even after the single `ingestion:lastRun` slot was overwritten.

Retry cadence follows the Java backend's clock: the scheduler runs at minute 0 of hours divisible by `INGESTION_SCHEDULE_HOURS` (default 8 → 00:00, 08:00, 16:00 UTC), and a successful or empty run waits for the next boundary. Only a run that never happened (lock held by another worker) or an exception is retried after 15 minutes. A productive or empty outcome does not shift the clock, and a manual run does not delay the next automatic one. A run that discovers candidates but saves none logs an error naming the `[AI_SYNTHESIS]` failures, because synthesis is the only stage that can drop an eligible article.

Diagnostics:

```bash
python manage.py ingest_news --dry-run   # per-feed eligible counts, no writes, no Gemini
python manage.py ingest_news --check-ai  # one tiny Gemini call, includes the provider's error text
```

Locks use the cache when available. Because `django-redis` returns `None` for `cache.add` when it swallows a connection error, an unreachable cache must not be treated as a held lock; `_acquire_lock` only blocks on an explicit `False`.

---

## 2. Data Structures

### `RawUpdate`

`ingestion.agents.rss.RawUpdate` is an in-memory dataclass produced by the RSS collector:

| Field | Description |
|---|---|
| `title`, `raw_content` | Feed entry title and cleaned text. |
| `source_url`, `canonical_url` | Original link and canonical link supplied by the collector. |
| `published_at`, `fetched_at` | Publication time and collection time. |
| `source_name`, `source_type` | Configured source name and `RSS`. |
| `author`, `language` | Optional entry author and feed language. |

### `RawIngestion`

The `ingestion.RawIngestion` model maps to the existing `raw_ingestion` table. Important fields:

- `id`, `run_id`, `event_id` — UUIDs for the row, discovery run, and event group.
- `title`, `raw_content`, `url`, `canonical_url` — cleaned content and normalized URLs.
- `url_hash`, `title_hash` — SHA-256 values used for exact deduplication.
- `processing_status` — `NEW` when created, `PROCESSED` after successful synthesis.
- Credibility/importance and event-lifecycle columns — retained for schema compatibility; synthesis fills the scores that the current API exposes.

Duplicates are discarded rather than inserted. A new unique candidate receives a fresh `event_id`; the same ID is used when the `TechnologyEvent` row is created.

### `TechnologyEvent`

The `catalog.TechnologyEvent` model maps to `technology_event` and is the read model for the API. Synthesis writes the headline, summary, category, topics, impacts, version/lifecycle fields, official links, source scores, and Gemini token/latency metadata.

There is no separate DTO layer. Internal code uses dataclasses and Django models; the API boundary converts snake_case request fields and renders camelCase response fields.

---

## 3. Discovery Phase

1. Load active `NewsSource` rows.
2. Collect each feed concurrently with `ThreadPoolExecutor(max_workers=DISCOVERY_THREAD_POOL_SIZE)`.
3. For each entry, require a publication date within the last `NEWS_FRESHNESS_HOURS` hours (default 24, 48 in `render.yaml`) and a software-engineering or `.NET` signal. Entries stamped up to 2 minutes ahead of the server clock are accepted, because feeds regularly publish slightly in the future.
4. Clean HTML with BeautifulSoup, normalize URLs, and compute URL/title SHA-256 hashes.
5. Discard exact duplicates within the current batch or in the database.
6. Compare remaining candidates against the last 7 days of raw rows: require publication times within 48 hours and token overlap, then apply Jaro-Winkler similarity ≥ `0.85`.
7. Rank unique candidates with the editorial quality score and select at most `NEWS_MAX_ARTICLES_PER_INGESTION` articles.
8. Insert selected candidates with `bulk_create` inside `transaction.atomic()`.

The detailed scoring and similarity rules are documented in [Agents.md](Agents.md).

---

## 4. Synthesis Phase

`synthesize_and_save` builds a prompt from the raw title and first 3,500 characters of content. The prompt:

- selects exactly one category from the known taxonomy;
- extracts 3–5 topics;
- requests importance and credibility scores from 0–100;
- extracts version, lifecycle status, impacts, migration notes, breaking changes, security notes, and official links;
- enforces specific headline rules.

Gemini is called with `temperature=0.2`, `max_tokens=2048`, and a strict-JSON system prompt. The response is parsed as JSON, falling back to `Emerging Tech` for an unknown category and the raw title when the generated title is empty. A successful synthesis writes one `TechnologyEvent`, marks the raw row `PROCESSED`, and records model/token/latency metadata.

On Gemini failure or malformed JSON, the raw row is deleted immediately and the exception is re-raised so the task can continue with the next candidate.

---

## 5. Failure and Locking Behaviour

| Situation | Behaviour |
|---|---|
| Scheduled run starts while another run holds the lock | Skipped with `{"skipped": true}`. |
| Ingestion already running | `ingest_all_feeds` skips and releases its lock. |
| Old unprocessed/failed raw rows exist | Deleted before discovery. |
| One RSS feed fails | Logged; other feeds continue. |
| One synthesis fails | Raw row deleted; remaining candidates continue. |
| Cache invalidation fails | Logged/swallowed; database remains authoritative. |
| Worker crashes mid-run | The cache lock expires after its timeout, allowing a later run. |

Locks use `cache.add` with 15 minutes for the scheduled wrapper and 60 minutes for the ingestion run. Cache invalidation removes `feed-v3:*`, `trends:*`, `trends:topic-counts-v1`, `trends:admin-v1`, and `totalBiteCount:global`.

---

## 6. Pruning

`prune_raw_ingestions`:

- deletes `PROCESSED` and `DUPLICATE` rows older than 14 days;
- deletes every remaining non-`PROCESSED` row;
- returns counts for processed and unprocessed deletions.

This keeps the raw staging table compact while preserving the synthesized `technology_event` read model.

---

## 7. Scheduling Summary

| Task | Schedule | Entry point |
|---|---|---|
| News ingestion | Every 8 hours at 00:00, 08:00, and 16:00 (`INGESTION_SCHEDULE_HOURS`) | `ingestion.tasks.scheduled_ingest` |
| Raw-ingestion pruning | Daily at midnight | `ingestion.tasks.prune_raw_ingestions` |
| CS push digest | Daily at 09:00 | `notifications.tasks.send_daily_cs_digest` |

The Celery schedule is defined in `backend/config/celery.py` and runs every 8 hours (`0 */8 * * *`), replacing the Java backend's 4-hour `@Scheduled(cron = "0 0 */4 * * *")`. The in-process scheduler in `backend/core/scheduler.py` implements the same fixed-clock semantics (`0 0 */N * * *`): it runs at the boundary, catches up once on boot after a missed boundary, and retries only a skipped or failed run after 15 minutes. Set `INGESTION_SCHEDULE_HOURS=4` to restore the Java cadence.
