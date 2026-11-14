# Architecture Review Report

This report reviews the Django backend's strengths, risks, scalability, security, and recommended next steps.

---

## 1. Architectural Highlights

### Strengths

- Clear app boundaries: `accounts`, `catalog`, `library`, `assistant`, `intelligence`, `notifications`, and `ingestion` each own their models and service logic.
- Client contracts are preserved: envelope responses, camelCase JSON, datetime formats, cursor pagination, and auth semantics match the existing web/mobile clients.
- The ingestion pipeline is split into collection, eligibility, deduplication, quality ranking, synthesis, and pruning stages that can fail independently.
- Celery workers and beat provide asynchronous ingestion, pruning, and push digests without blocking API requests.
- Read/write splitting, Redis caching, keyset pagination, and database indexes provide a practical scaling baseline.
- Contract tests cover every ported controller surface and the main auth/admin rules.

### Risks

- **Deduplication cost**: near-duplicate detection compares candidates against a 7-day raw set and degrades quadratically as that set grows.
- **AI dependency**: synthesis depends on Gemini availability, quota, and valid JSON; the fallback chain reduces but does not eliminate this risk.
- **Schema assumption**: first deployment uses `migrate --fake-initial`, which assumes the existing TiDB schema matches the Django models. A schema drift check is required before production rollout.
- **Rate-limit fallback**: when Redis is unavailable, throttling falls back to per-process memory, so limits are not global across instances.
- **Placeholder intelligence data**: graph, technology, company, release, timeline, and compare endpoints return stable sample data until real sources are connected.
- **Worker availability on Render**: background workers require a paid instance type; the free plan cannot run scheduled ingestion or digests.
- **Mobile-only routes**: some routes outside the ported controller surface intentionally return `404`.

---

## 2. Security Review

- Firebase ID tokens are verified server-side with Firebase Admin SDK; test-only tokens are gated by `ALLOW_TEST_AUTH`.
- Admin routes require the database `ADMIN` role, and public/authenticated path rules are enforced in middleware before DRF dispatch.
- AI endpoints are rate-limited per user and per IP; throttling fails closed if the limiter cannot be evaluated.
- CORS is restricted to the configured web origin, localhost, and `192.168.1.*` origins with the expected headers.
- CSRF and clickjacking middleware are enabled. Production settings enable secure cookies and trust the proxy's HTTPS header.
- Secrets are environment-driven. Firebase service-account JSON, `.env` files, and database credentials must never be committed.
- Input handling: event IDs and collection ownership are checked in views; Gemini responses are parsed as structured JSON; HTML is sanitized before storage.

---

## 3. Recommendations

1. **Partition or index the deduplication window** before the raw table reaches millions of rows.
2. **Add ingestion unit/integration tests** for URL normalization, eligibility, Jaro-Winkler, quality ranking, and synthesis failure handling.
3. **Run a real load test** against staging TiDB/Redis and record RSS, Gemini, database, and queue timings.
4. **Deploy worker and beat on a paid plan** or external scheduler so ingestion, pruning, and digests run reliably.
5. **Add schema-drift detection** before relying on `--fake-initial` in a new environment.
6. **Move shared rate-limit and AI-cooldown state to Redis** if the API scales beyond one instance.
7. **Replace placeholder intelligence data** with persisted technology/company/release data when those sources are available.
8. **Monitor Gemini quotas, fallback usage, ingestion duration, and raw-table growth** with structured alerts.
