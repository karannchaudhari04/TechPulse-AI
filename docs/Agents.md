# Agent Algorithmic Details

This document details the functional algorithms and operations executed inside every pipeline agent in **TechPulse AI**.

---

## 1. Content Cleaning Agent

### HTML Tag Removal
HTML tags are stripped safely by parsing the raw document text using JSoup's `.body().wholeText()` to prevent stripping structural line breaks.

### URL Normalizer Logic
The URL normalizer cleans URLs using the following steps:
1. Strips fragments (anything starting with `#`).
2. Standardizes protocol and hostname to lowercase (e.g. `HTTPS://Foo.Com` -> `https://foo.com`).
3. Collapses double slashes (`//`) into single ones.
4. Strips trailing slashes from path names.
5. Scrubs tracking query parameters (`utm_*`, `fbclid`, `gclid`).

---

## 2. Classification Agent

### Configurable Keyword Engine
Keyword patterns are mapped to `CategoryType` enums inside [application.yml](file:///d:/TechBite/backend/src/main/resources/application.yml). The classification agent dynamically loops over configured key patterns to check for occurrences inside the text.

### Confidence Score Calculation
The agent calculates a normalized confidence score based on the frequency of keyword hits. Hits inside the title are given a higher weight (2.0x) compared to hit occurrences inside the text description (1.0x). The score is normalized using the total word count of the update:

$$\text{Score} = \min\left(1.0, \frac{2.0 \times \text{TitleHits} + \text{ContentHits}}{\max(1, \text{WordCount} / 50)}\right)$$

---

## 3. Duplicate Detection Agent

### Deduplication Priority
The deduplication agent checks two primary criteria to identify duplicate updates:
1. **Exact URL match**: If the canonical URL matches an existing database entry or an item inside the current batch, it is marked as a duplicate with a match score of `1.0` and reason `EXACT_URL`.
2. **Jaro-Winkler Proximity**: If the Jaro-Winkler similarity score of the two titles is $\ge 0.85$ and the publication times are within 48 hours, it is marked as a duplicate with a match score equal to the Jaro-Winkler metric and reason `TITLE_SIMILARITY`.

### Event-Oriented Grouping
Duplicate updates reuse the event ID (UUID) of the original candidate update, allowing multiple updates from different tech sites to group under a single, unified Event ID.

---

## 4. Credibility Judge Agent

### Source Reliability Baseline
Evaluates the baseline trust score of hostnames configured in configuration. Defaults to `0.70` for unknown blogs or sites.

### Bonuses and Penalties
- **Official Announcement**: Adds `+0.15` for official vendor domains.
- **Agreement**: Adds `+0.05` per independent organization, capped at `+0.20`.
- **Clickbait Heuristics**: Applies penalties for ALL CAPS titles (`-0.15`), multiple exclamation marks (`-0.10`), short descriptions (`-0.10`), or configured clickbait keywords (`-0.20`).

---

## 5. Importance Ranking Agent

### Scoring Formula
$$\text{Score} = \max\left(0.0, \min\left(1.0, W_{cat} + B_{fresh} + B_{official} + B_{org} + B_{release} + B_{security} + B_{breaking}\right)\right)$$

### Algorithmic Heuristics
1. **Category Weight ($W_{cat}$)**: Mapped from matching categories configured in YAML. Defaults to `0.50`.
2. **Freshness ($B_{fresh}$)**: Calculated via encapsulated `FreshnessScorer`. Adds `+0.25` for updates $\le 1$ hour, `+0.15` for updates $\le 24$ hours, and `+0.05` for updates $\le 7$ days.
3. **Official Release Bonus ($B_{official}$)**: Adds `+0.15` if the event is officially announced.
4. **Organization Diversity Bonus ($B_{org}$)**: Scales dynamically based on organization count:
   - 2 Organizations: `+0.10`
   - 3 Organizations: `+0.15`
   - 4+ Organizations: `+0.20`
5. **Major Release Detection ($B_{release}$)**: Regex pattern detects semantic versioning structures (`v?1.2.3`) and keywords (`GA|Stable|Released|Launch|LTS|Preview|RC|Beta`). Adds `+0.10`.
6. **Security Vulnerability ($B_{security}$)**: Regex pattern matches CVE structures and keywords (`RCE|Zero-Day|Vulnerability|Patch|Critical|Exploit|Authentication Bypass|Privilege Escalation`). Adds `+0.15`.
7. **Breaking Change ($B_{breaking}$)**: Regex pattern matches deprecations or migrations (`Breaking|Deprecated|Migration|Removed|API Change`). Adds `+0.10`.
