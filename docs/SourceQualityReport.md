# Source Quality and Ingestion Health

This document describes how TechPulse AI evaluates and ingests technology news sources in the Django backend.

---

## 1. Source Configuration

Sources are stored in the `news_sources` table and managed through the Django admin or database tooling. Each row has:

- `name` — display name used in logs and feed metadata;
- `url` — RSS/Atom endpoint;
- `active` — whether discovery should collect it;
- `created_at`, `updated_at` — audit timestamps.

Discovery loads only rows with `active=True`. Adding or disabling a source does not require a code change.

---

## 2. Collection Standards

Each feed is collected with `requests` + `feedparser`:

| Control | Implementation |
|---|---|
| Retry policy | Up to 3 attempts with a 1-second delay. |
| Network timeout | 10 seconds connect, 10 seconds read. |
| User agent | `TechPulse-News-Bot/1.0`. |
| Per-feed cap | At most 8 accepted entries per run. |
| Publication requirement | A parsed publication time is required. |
| Freshness window | Publication must be within the last 24 hours and not in the future. |
| Relevance filter | Title/content must match a software-engineering or `.NET` signal. |
| Entry isolation | Mapping errors are logged per entry; the rest of the feed continues. |
| Source isolation | A failed source is logged; other collectors finish normally. |

The per-feed cap is intentionally small because discovery processes many sources and a bounded synthesis budget.

---

## 3. Quality Controls

### HTML cleanup
BeautifulSoup removes markup and preserves readable paragraph breaks. Empty or whitespace-only content is rejected.

### URL normalization
Tracking parameters (`utm_*`, `fbclid`, `gclid`), fragments, duplicate slashes, and trailing slashes are removed before hashing.

### Deduplication
Exact URL/title hashes are checked first. Candidate titles are then compared against the last 7 days of raw rows using token overlap and Jaro-Winkler similarity. A score of `0.85` or higher is treated as a duplicate.

### Editorial ranking
Candidates receive points for trusted domains, technical detail, release/security signals, content length, and recency. Promotional or low-signal wording is penalized. Each source is capped at 4 selected articles per run.

### Synthesis validation
Gemini output must be valid JSON. Unknown categories fall back to `Emerging Tech`; empty headlines fall back to the raw title; invalid responses cause the raw row to be deleted rather than publishing incomplete data.

---

## 4. Operational Health Signals

The admin endpoint `GET /api/v1/admin/news/health` reports:

- `database` — source count or failure detail;
- `redis` — currently reported as `UP` when the API can build the report;
- `collectors` and `pipeline` — pipeline status indicators.

It returns HTTP `503` when the database check fails. `GET /api/v1/admin/news/daily-counts` exposes today's and yesterday's fetched-row counts for volume monitoring.

Discovery logs include the run ID, number of active sources, successful/failed collectors, candidate count, eligibility rejections, duplicates, selected articles, and duration. These logs are the primary source for feed-level reliability analysis.

---

## 5. Evaluating a New Source

Before enabling a source:

1. Confirm the endpoint returns valid RSS/Atom XML.
2. Check that entries include publication timestamps and article links.
3. Verify the content passes the software-engineering relevance filter.
4. Confirm the domain is not dominated by promotional or low-signal content.
5. Run a manual ingestion and inspect the discovery log for accepted/rejected counts.
6. Review synthesized events for headline quality, category selection, and duplicate suppression.
