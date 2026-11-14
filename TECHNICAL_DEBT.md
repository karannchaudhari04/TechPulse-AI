# Technical Debt and Architectural Review Report

This report documents architectural strengths, risks, and identified technical debt in the Django backend.

---

## 1. Prioritized Technical Debt Log

| Priority | Issue / Tech Debt Area | Impact | Recommended Action |
|---|---|---|---|
| **High** | Quadratic near-duplicate scan | Discovery compares candidates against the 7-day `raw_ingestion` set; cost grows with table size. | Partition by `fetched_at`, narrow the comparison window, and move exact lookups to indexed hash queries. Consider vector search for semantic deduplication. |
| **High** | `--fake-initial` assumes the legacy schema matches Django models | A schema mismatch can surface only at runtime in a new environment. | Add a schema-drift check or a read-only introspection command before production deploys. |
| **Medium** | Synthesis is not atomic with raw-status updates | A crash between `TechnologyEvent.save()` and `RawIngestion.save()` can leave inconsistent status. | Wrap event creation and raw status update in `transaction.atomic()` and handle retries idempotently. |
| **Medium** | JSON data stored in text columns | Breakdowns, topics, categories, and links are serialized JSON strings, limiting database-side queries. | Use native JSON columns or separate relational tables if query requirements grow. |
| **Medium** | In-memory rate-limit and AI-cooldown fallbacks | When Redis is unavailable, limits and model cooldowns are per process, not global. | Keep Redis healthy and monitor fallback usage; move shared state to Redis when scaling beyond one API instance. |
| **Medium** | Placeholder intelligence endpoints | Graph, technology, company, release, timeline, and compare return sample data. | Back them with persisted technology/company/release data when those sources are available. |
| **Medium** | Ingestion test coverage | Contract tests cover the API, but URL normalization, eligibility, ranking, and dedupe lack dedicated unit tests. | Add unit tests with fixture feeds and deterministic timestamps. |
| **Low** | Synthetic benchmark endpoint | `run-benchmarks` returns computed estimates rather than measured timings. | Add a real staging benchmark harness for RSS, Gemini, DB, and queue latency. |
| **Low** | Mobile-only route gaps | Some legacy mobile routes intentionally return `404`. | Implement only if the clients begin calling them. |
| **Low** | Render free-plan worker limitation | Scheduled ingestion and digests do not run without a background worker. | Deploy worker/beat on a paid instance or an external scheduler. |

---

## 2. Architecture Review

### Strengths

- **Clear app boundaries**: accounts, catalog, library, assistant, intelligence, notifications, and ingestion each own their models and service logic.
- **Contract compatibility**: the API envelope, camelCase rendering, datetime format, cursor paging, and auth rules preserve existing clients.
- **Failure isolation**: per-source collection failures, per-article synthesis failures, and Redis outages do not stop unrelated work.
- **Operational controls**: distributed ingestion locks, bounded article counts, per-source caps, and midnight pruning keep runs predictable.
- **Security**: Firebase token verification, admin role checks, rate limiting, CORS restrictions, and production cookie/proxy settings are in place.

### Risks

- **External AI dependency**: Gemini latency, quota, and JSON validity directly affect ingestion throughput.
- **Database scale**: the raw staging table and near-duplicate scan need partitioning before high volume.
- **Single-region Redis**: cache and lock availability affect throttling and scheduled-run coordination.
- **Schema coupling**: model definitions must stay aligned with the legacy TiDB schema.
- **Observability gaps**: logs are structured, but there is no metrics/tracing backend yet.

### Next Steps

1. Add ingestion unit tests and a staging integration test for one mocked RSS feed.
2. Add schema-drift verification to the deployment checklist.
3. Partition `raw_ingestion` by `fetched_at` and measure deduplication cost.
4. Replace placeholder intelligence reads with persisted data.
5. Deploy worker/beat and add monitoring for ingestion duration, Gemini fallback rate, raw-table growth, and queue depth.
