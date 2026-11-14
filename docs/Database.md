# Database Schema and Performance

This document describes the TiDB schema used by the Django backend, the model-to-table mapping, and the indexes that support feed and ingestion queries.

---

## 1. Schema Strategy

The Django port reuses the existing TiDB tables rather than introducing a new schema:

- Every model declares `Meta.db_table` with the legacy table name.
- Column names match the legacy schema, including snake_case names such as `firebase_uid`, `categories_json`, and `raw_content`.
- The first production deployment runs `python manage.py migrate --fake-initial` so existing tables are marked as applied without being recreated.
- New framework tables (`auth`, `admin`, `sessions`) are created normally on that migration run.
- Django 6.0's MySQL backend normally adds a foreign-key column and its constraint in one `ALTER TABLE` statement. TiDB validates the constraint against the pre-statement schema and fails with `Key column '<name>_id' doesn't exist in table`. `config.db.enable_tidb_schema_compatibility()` (called from `CoreConfig.ready()`) disables the inline form so Django emits `ADD COLUMN` and the deferred `ADD CONSTRAINT` separately, which TiDB accepts.

Before deploying against a new database, compare the Django models with the live schema rather than assuming `--fake-initial` is safe.

---

## 2. Model-to-Table Mapping

| App | Model | Table |
|---|---|---|
| `accounts` | `Category` | `categories` |
| `accounts` | `UserAccount` | `users` |
| `accounts` | `UserPreference` | `user_preferences` |
| `accounts` | `LoginAudit` | `login_audit` |
| `accounts` | `UserProfile` | `user_profile` |
| `accounts` | `UserInterest` | `user_interest` |
| `accounts` | `UserFollow` | `user_follow` |
| `catalog` | `TechnologyEvent` | `technology_event` |
| `catalog` | `EventTimeline` | `event_timeline` |
| `library` | `UserSavedEvent` | `user_saved_event` |
| `library` | `UserCollection` | `user_collection` |
| `library` | `CollectionEvent` | `collection_event` |
| `library` | `InteractionLog` | `interaction_log` |
| `library` | `UserHistoryLog` | `user_history_log` |
| `library` | `RecommendationHistory` | `recommendation_history` |
| `library` | `SearchHistory` | `search_history` |
| `notifications` | `NotificationRule` | `notification_rule` |
| `notifications` | `NotificationEvent` | `notification_event` |
| `ingestion` | `RawIngestion` | `raw_ingestion` |
| `ingestion` | `NewsSource` | `news_sources` |

---

## 3. Index Audit for `raw_ingestion`

| Index Name | Column(s) | Purpose |
|---|---|---|
| `PRIMARY` | `id` | Point lookups for a raw record. |
| `idx_raw_run_id` | `run_id` | Batch inspection and run-level updates. |
| `idx_raw_status` | `processing_status` | Find `NEW` rows and prune non-`PROCESSED` rows. |
| `idx_raw_event_id` | `event_id` | Resolve raw rows for an event. |
| `idx_raw_canonical_url` | `canonical_url` | URL lookups and audit. |
| `idx_raw_published_at` | `published_at` | Publication-time range queries. |
| `idx_raw_fetched_at` | `fetched_at` | The 7-day deduplication candidate scan and feed ordering. |

A unique constraint protects `url_hash`; `title_hash` is used for exact-title checks during discovery.

---

## 4. Ingestion and Scoring Columns

`raw_ingestion` retains the legacy audit columns:

### Credibility
- `credibility_score` (`DOUBLE`)
- `credibility_level` (`VARCHAR`)
- `credibility_confidence` (`DOUBLE`)
- `score_baseline`, `score_official_bonus`, `score_agreement_bonus`, `score_clickbait_penalty`
- `is_official` (`BOOLEAN`)

### Importance
- `importance_score` (`DOUBLE`)
- `importance_level` (`VARCHAR`)
- `importance_confidence` (`DOUBLE`)
- `importance_breakdown_json` (`TEXT`)
- `importance_reasons_json` (`TEXT`)

### Event lifecycle
- `event_first_seen` (`TIMESTAMP`)
- `event_last_updated` (`TIMESTAMP`)
- `event_source_count` (`INT`)
- `retry_count`, `last_attempt_at`, `failure_reason`

The current synthesis path obtains credibility and importance scores from Gemini and stores them on `technology_event` for API reads. The raw audit columns remain for schema compatibility and future backfills.

---

## 5. Retention and Pruning

`ingestion.tasks.prune_raw_ingestions` runs daily at midnight:

- deletes `PROCESSED` and `DUPLICATE` rows older than 14 days;
- deletes all remaining non-`PROCESSED` rows;
- returns processed/unprocessed deletion counts.

`ingest_all_feeds` also removes leftover non-`PROCESSED` rows before each run to prevent failed staging rows from accumulating.

---

## 6. Scale Preparation

1. **Partition `raw_ingestion` by `fetched_at`** (monthly or weekly) so the 7-day deduplication scan only touches the latest partition.
2. **Keep the existing TiDB feed keyset index** on `technology_event` for `(fetched_at, id)` ordering.
3. **Cache aggregate reads** (feed IDs, topic counts, trends, global event count) to reduce repeated scans.
4. **Limit ingestion batch size** with `NEWS_MAX_ARTICLES_PER_INGESTION` and the per-source selection cap.
5. **Monitor table growth** and prune cadence before increasing ingestion frequency.
