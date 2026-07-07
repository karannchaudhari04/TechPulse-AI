# Database Schema and Performance Optimization

This document covers database design, index strategies, query optimizations, and scale preparation for **TechPulse AI**.

---

## 1. Index Audit for `raw_ingestion` Table

A complete index audit was performed to optimize read and write operations. The table below lists all active indexes and explains their performance benefits:

| Index Name | Indexed Column(s) | Purpose | Expected Query Improvements |
|---|---|---|---|
| `PRIMARY` | `id` | Row uniqueness (UUID) | Point lookups on a specific record are resolved in $O(1)$ time. |
| `idx_raw_run_id` | `run_id` | Pipeline batch updates | Speeds up batch updates of raw records belonging to a specific orchestrator execution run. |
| `idx_raw_status` | `processing_status` | Status filtering | Allows downstream processing agents to scan only `NEW` records, avoiding full table scans. |
| `idx_raw_event_id` | `event_id` | Event-oriented grouping | Essential for resolving duplicate relationships and matching articles by event groups. |
| `idx_raw_canonical_url` | `canonical_url` | URL deduplication | Accelerates exact URL lookups during duplicate checks. |
| `idx_raw_published_at` | `published_at` | range queries | Speeds up timestamp range queries for fresh article aggregations. |
| `idx_raw_fetched_at` | `fetched_at` | Deduplication window scan | **Crucial Optimization**: Accelerates the query `WHERE r.fetchedAt >= :since` run by `DuplicateDetectionAgent` to scan candidate articles from the last 7 days. |

---

## 2. Ingestion & Scoring Columns

The `raw_ingestion` table includes specialized audit columns for both credibility and importance layers:

### Credibility Fields
- `credibility_score` (DOUBLE): Trustworthiness score.
- `credibility_level` (VARCHAR): `LOW|MEDIUM|HIGH|VERIFIED`.
- `credibility_confidence` (DOUBLE): Score confidence level.
- `score_baseline`, `score_official_bonus`, `score_agreement_bonus`, `score_clickbait_penalty`: Scoring breakdowns.
- `is_official` (BOOLEAN): Official source indicator.

### Importance Fields
- `importance_score` (DOUBLE): Ecosystem importance score.
- `importance_level` (VARCHAR): `BACKGROUND|LOW|MEDIUM|HIGH|CRITICAL`.
- `importance_confidence` (DOUBLE): Confidence in the assessment.
- `importance_breakdown_json` (TEXT): Standardized JSON string containing breakdown weights.
- `importance_reasons_json` (TEXT): JSON array of triggered reasons.

### Event Lifecycle Metadata
- `event_first_seen` (TIMESTAMP): Newest publish/fetched time of first article in event.
- `event_last_updated` (TIMESTAMP): Latest publish/fetched time in event.
- `event_source_count` (INT): Number of distinct organizations reporting the event.

---

## 3. Scale Preparation for Millions of Records

To prepare the database schema for future growth to millions of records, the following mechanisms are planned:

1. **Partitioning on `fetched_at`**:
   - As the table grows, we can partition it by month or week using `fetched_at` range partitioning. This ensures that the 7-day deduplication scan only hits the latest partition, keeping the search space small and queries extremely fast.
2. **Scheduled Pruning**:
   - The implemented `PruningScheduler` automatically deletes entries older than 14 days, keeping the `raw_ingestion` table compact and stable.
