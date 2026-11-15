# Testing and Resilience Report

This document describes the Django test setup, the contract suite, and how the backend handles failures in the ingestion and API paths.

---

## 1. Test Setup

Tests run with `pytest` + `pytest-django` from `backend/`:

```bash
python -m pytest -q
```

When the settings module detects pytest, it forces an isolated test environment:

- SQLite instead of TiDB;
- local-memory cache instead of Redis;
- Celery eager mode;
- WhiteNoise removed because `collectstatic` is not part of the test run;
- `ALLOW_TEST_AUTH` enabled, so tests can authenticate with `Authorization: Bearer test:<uid>`.

The suite currently contains **18 contract tests** in `backend/tests/test_contracts.py`, one TiDB schema-compatibility regression test in `backend/tests/test_tidb_compat.py`, and twelve ingestion-scheduling tests in `backend/tests/test_ingestion_scheduling.py` (fail-open locks, sync/enqueue triggers, HEAD health, and the in-process schedule). They cover:

| Area | Tests |
|---|---|
| Health and public feed | raw `/actuator/health`, envelope shape, empty feed page, cursor pagination, categories |
| Authentication and policy | protected route returns 401, public bite detail vs. authenticated explain route, admin prefix role checks |
| Accounts | register/login user creation and camelCase response |
| Search and events | search contract, missing query validation, event detail, related events |
| Intelligence | public placeholder reads, authenticated brief, brief validation |
| Assistant | chat contract and context limit |
| Notifications | list/unread/read/delete/preferences |
| Admin ingestion | raw health report, role checks, daily counts, trends, benchmark, trigger |
| Library | bookmarks, history, collections, interactions, statistics |
| Preferences/profile | preference updates and profile payload |

The tests assert the response envelope keys, camelCase fields, status codes, and key model side effects.

---

## 2. Resilience Behaviour

| Failure scenario | Impact | Recovery action |
|---|---|---|
| RSS timeout, HTTP error, or DNS failure | One collector cannot fetch its feed. | `rss.collect` retries up to 3 times with a 1-second delay. The discovery future fails for that source only; other sources continue. |
| Malformed or empty feed | `feedparser` returns no usable entries. | The collector returns an empty list; discovery continues with other sources. |
| Entry outside the 24-hour/relevance window | Irrelevant or stale article. | Rejected by `is_eligible` before cleaning or persistence. |
| Duplicate URL/title/near-duplicate | Repeated story. | Discarded before `RawIngestion` insertion. |
| Gemini HTTP error or transport failure | Synthesis cannot complete for one article. | The fallback model chain is tried. If all models fail, the raw row is deleted and the task continues with the next candidate. |
| Malformed Gemini JSON | Synthesis cannot map the response. | The raw row is deleted, the error is logged, and the task continues. |
| Database write failure during discovery | The batch cannot be saved. | The atomic `bulk_create` fails; the task lock is released in `finally`, and the next scheduled run can retry. |
| Database failure in admin health | Health component is down. | `/api/v1/admin/news/health` returns a raw report with status `DOWN` and HTTP `503`. |
| Redis unavailable | Cache and distributed rate limits are unavailable. | Cache reads fall back to the database; rate limiting falls back to per-process buckets. AI endpoints fail closed with `503` when throttling cannot be evaluated. |
| Duplicate scheduled run | Two workers could ingest concurrently. | `scheduled_ingest` and `ingest_all_feeds` acquire cache locks and skip when held. |
| Worker crash during a run | Lock remains until timeout. | The 15-minute/60-minute cache lock expires; a later run proceeds. |
| Old unprocessed rows | Staging table growth. | Cleaned before ingestion and again by the midnight pruning task. |

---

## 3. Contract Compatibility Checks

The contract suite verifies behaviour that the unchanged web and mobile clients depend on:

- every API response uses `{ success, message, data, timestamp, traceId }`;
- feed pages use `{ content, nextCursor, hasNext }`;
- JSON fields are camelCase while request bodies accept the snake_case fields used by the clients;
- datetimes use the legacy `LocalDateTime`-style format without a timezone suffix;
- authentication and admin path rules produce the expected `401`/`403` responses;
- assistant, intelligence, notifications, library, and admin endpoints keep their expected shapes.

---

## 4. Static Verification

The following commands are part of the release check:

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python -m compileall -q accounts assistant catalog config core ingestion intelligence library notifications tests
python -m pytest -q
```

`backend/tests` runs against SQLite, so it does not require TiDB, Redis, Firebase credentials, or a Gemini key.

---

## 5. Known Gaps

- No live RSS or Gemini integration tests run in CI; the contract suite mocks or avoids external calls.
- The ingestion algorithms (URL normalization, eligibility, Jaro-Winkler, quality ranking) do not yet have dedicated unit tests.
- Load and benchmark results are synthetic; see [Performance.md](Performance.md).
- The mobile-only bite, recommendation, assistant title/suggestions, search suggestion/history/trending, CVE, event-list, user-collection alias, and following routes may intentionally return `404` because they are outside the ported controller surface.
