# Pipeline and Service Algorithms

This document describes the algorithms used by the Django ingestion pipeline, feed services, and AI clients.

---

## 1. RSS Collection

`ingestion.agents.rss.collect` fetches a configured feed with `requests` and parses it with `feedparser`.

- **Retries**: up to 3 attempts with a 1-second delay between attempts.
- **Timeouts**: 10 seconds to connect and 10 seconds to read.
- **User agent**: `TechPulse-News-Bot/1.0`.
- **Entry cap**: stops after 8 accepted entries from a single feed.
- **Required fields**: publication time, non-empty title, non-empty cleaned content, and a link.
- **Isolation**: a failure for one source is logged by the discovery thread; other sources continue.

A feed that fails all retries raises an error from that collector, which the discovery phase catches per source.

---

## 2. Eligibility Filter

`ingestion.agents.text.is_eligible` accepts an entry only when:

1. A publication time exists.
2. The publication time is within the last 24 hours and not in the future.
3. The title/content contains a software-engineering signal or a `.NET` signal.

The software-engineering pattern covers developer tools, programming languages, open source, APIs, frameworks, cloud/DevOps, databases, security, CVEs, and related topics. This rejects general business news and promotional content before it reaches deduplication.

---

## 3. HTML Cleaning

`ingestion.agents.common.clean_html` uses BeautifulSoup with the `html.parser` backend:

1. Extract text with newline separators.
2. Unescape HTML entities.
3. Normalize line endings.
4. Collapse runs of 3+ newlines to two.
5. Collapse horizontal whitespace.
6. Trim the result.

This preserves readable paragraph structure while removing markup.

---

## 4. URL Normalization

`ingestion.agents.urls.normalize`:

1. Lowercases the scheme and hostname.
2. Collapses repeated slashes in the path.
3. Removes a trailing slash when the path is longer than `/`.
4. Removes `utm_*`, `fbclid`, and `gclid` query parameters.
5. Drops URL fragments.
6. Keeps a non-default port (ports 80 and 443 are omitted).
7. Rebuilds the URL with `urlunsplit`.

Malformed URLs are returned unchanged.

---

## 5. Title Normalization and Similarity

`normalize_title` lowercases the title, removes non-alphanumeric characters, and collapses whitespace.

`has_token_overlap` removes common stop words and checks whether two titles share at least:

- two tokens; or
- one token when the existing candidate title has at most three tokens or both titles have the same number of tokens.

`jaro_winkler` implements the Jaro-Winkler metric, including a matching window, transposition counting, and a prefix bonus for up to four leading characters. The final score is rounded to two decimal places.

---

## 6. Deduplication

Deduplication runs in this order:

1. **Batch exact match**: compare the candidate's URL hash or normalized-title hash against candidates already accepted in the current run.
2. **Database URL hash**: query `RawIngestion` by `url_hash`.
3. **Database title hash**: query `RawIngestion` by `title_hash`.
4. **Near-duplicate search**: load `RawIngestion` rows from the last 7 days and compare each candidate with entries whose publication times are within 48 hours. Only entries passing `has_token_overlap` are scored with Jaro-Winkler.
5. **Threshold**: a Jaro-Winkler score of at least `0.85` is a duplicate.

Duplicates are discarded and counted in the run log. Accepted candidates receive a new UUID `event_id`, which becomes the `TechnologyEvent` primary key after synthesis.

The current near-duplicate scan is the most expensive part of discovery: it is quadratic in the number of candidates relative to the 7-day comparison set.

---

## 7. Editorial Quality Ranking

After deduplication, `select_top_articles` ranks candidates using a base score and additive factors:

| Signal | Score |
|---|---|
| Base score | `+20` |
| Trusted technology domain | `+30` |
| Contains technical detail | `+10` |
| Additional technical-detail hits | `+3` each, capped at `+18` |
| Strong update signal (release, launch, CVE, deprecation, patch, etc.) | `+15` |
| Content length ≥ 250 characters | `+5` |
| Promotional/low-signal wording | `-30` |
| Recent publication | up to `+12`, decreasing by 1 per 2 hours |

The trusted-domain list includes vendor engineering blogs, GitHub, cloud providers, major technology publications, and security vendors. Ranking uses stable sorts: URL ascending, then publication time descending, then editorial score descending, so the score is the primary key and the earlier sorts act as tie-breakers. Selection also enforces a maximum of 4 articles per source and stops at `NEWS_MAX_ARTICLES_PER_INGESTION`.

---

## 8. Gemini Synthesis

`ingestion.agents.synthesis.synthesize_and_save` builds a strict JSON prompt and calls the shared Gemini client with:

- `temperature=0.2`
- `max_tokens=2048`
- a system prompt requiring JSON only
- a user prompt containing the raw title and up to 3,500 characters of content

The prompt requires exactly one category from:

- Problem Solving
- Development
- AI & Machine Learning
- Cloud & DevOps
- System Design & Backend
- Cybersecurity
- Data Science & Analytics
- Product & UI/UX
- Open Source & GitHub
- Career & Placements
- Emerging Tech

It requests a headline, summary, 3–5 topics, credibility/importance scores, version and lifecycle fields, technical/developer/enterprise impacts, migration notes, breaking changes, security notes, and official links.

Response handling:

- Markdown code fences are stripped before JSON parsing.
- Non-object JSON is rejected.
- Unknown categories become `Emerging Tech`.
- Empty generated titles fall back to the raw title.
- Missing official links fall back to the raw article URL.
- Missing credibility/importance scores default to `80.0` and `70.0`.
- A Gemini or JSON failure deletes the raw row and raises an error for the task loop to continue.

On success, the event is written with `summary_status="READY"` and the raw row becomes `PROCESSED`.

---

## 9. Gemini Fallback and Cooldowns

`core.ai.generate` calls the Gemini OpenAI-compatible `chat/completions` endpoint.

- The primary model is `GEMINI_MODEL`; additional models come from `GEMINI_FALLBACK_MODELS`.
- A model is skipped while its per-API-key/per-model cooldown is active.
- `404`, `429`, and `5xx` responses advance to the next model; other HTTP errors are raised immediately.
- Transport errors advance to the next model.
- On `429`, the cooldown is based on `Retry-After`, or ends at the next Pacific-time day boundary for per-day quota errors.
- If every model is exhausted, a `RuntimeError` is raised with the last error.

`core.ai.extract_message` unwraps JSON responses containing `content`, `response`, or `text`; otherwise it returns the raw content.

---

## 10. Personalization and Library Signals

`library.services.record_interaction` stores every interaction and applies these weights to the event's categories and topics:

| Interaction | Weight |
|---|---|
| `SHARE` | `+6` |
| `BOOKMARK` | `+5` |
| `READ_COMPLETE` | `+4` |
| `LIKE` | `+3` |
| `CLICK` / `VIEW` | `+1` |
| `SKIP` | `-2` |
| `DISMISS` | `-3` |

Interest weights are clamped to `[-10, 20]`. History is updated for `VIEW`, `CLICK`, and `READ_COMPLETE`; a value above 100 is treated as reading duration in seconds, while a value from 0–100 is treated as completion percentage. A `READ_COMPLETE` interaction sets completion to 100%.

The feed itself is chronological and supports category/technology filters. Bookmark and read state are added when mapping each event to the client payload.

---

## 11. Trends

`build_trends` counts topic occurrences across `TechnologyEvent.entities_json`, orders the top 15, and labels each topic:

- `EXPLODING` at 10+ events (the value currently emitted by the API)
- `RISING` at 5–9 events
- `STABLE` below 5

Authenticated users also see whether a topic matches a followed topic or one of their preferred categories. Topic counts are cached for 5 minutes.

The admin trend report in `ingestion.services.calculate_trends` uses a separate 7/14/21-day window, growth and velocity calculations, credibility/importance weighting, and labels from `Dormant` through `Exploding`.

---

## 12. Assistant and Intelligence Services

- **Assistant chat** validates a prompt (maximum 4,000 characters), up to 20 history messages, and a combined context limit of 12,000 characters. It calls Gemini with the assistant API key (falling back to the main key), unwraps the JSON `content` field, and returns a non-persisted conversation payload.
- **Regenerate** returns `409` because conversations are not persisted.
- **History** returns `{"persisted": false, "conversations": []}`.
- **Intelligence brief** validates `topic` (maximum 200 characters) and `format` (`summary`, `technical`, `migration`, `security`, `markdown`, or `pdf`), then calls Gemini for a short engineering brief.
- **Public intelligence reads** (graph, technology, company, release, timeline, compare) intentionally return stable placeholder data so clients have a consistent contract until those views are backed by real data.
