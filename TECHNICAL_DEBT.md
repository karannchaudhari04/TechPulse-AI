# Technical Debt and Architectural Review Report

This report documents the architectural strengths, risks, scalability capabilities, and identified technical debt for **TechPulse AI** prior to starting Phase 6.

---

## 1. Prioritized Technical Debt Log

| Priority | Issue / Tech Debt Area | Impact | Recommended Action |
|---|---|---|---|
| **High** | In-Memory Deduplication Quadratic Scale | As historical records grow, comparing a batch against all recent records in-memory ($O(N^2)$) becomes slower. | Transition to database-level lookup filters (e.g. hash-based title checks) or vector indexing. |
| **Medium** | Lack of Transaction Boundaries | Saving raw updates and updating status are run in independent transactional steps. | Introduce proper `@Transactional` boundaries in `PipelineOrchestrator` to ensure atomic updates. |
| **Medium** | JSON Column Stringification | Breakdown and reasons maps are persisted as serialized JSON text blocks inside TEXT columns. | If complex queries are required on individual scores, translate them into separate relational attributes or native JSON columns. |
| **Low** | Hardcoded Thread Pool Size | DiscoveryAgent thread pool size is hardcoded to 10. | Externalize thread pool limits to `application.yml` properties. |

---

## 2. Architecture Review

### Strengths:
- **Loose Coupling**: All pipeline agents are completely independent and interact only via immutable DTOs conforming to the shared `ScoreAssessment` interface.
- **Fail-Safety**: Network and parsing errors are fully isolated at the collector level.
- **Configurability**: Keywords, source weights, clickbait filters, categories, and bonuses are all configured in YAML, avoiding hardcoded values.

### Risks:
- **Memory Consumption**: High volume ingestion runs hold multiple raw updates in memory. Under extreme load, this could trigger JVM out-of-memory errors if not restricted.
- **Network Dependency**: RSS feeds are crawled synchronously per feed. Slow feeds can delay the discovery phase. (Partially mitigated by CompletableFuture timeout bounds).
