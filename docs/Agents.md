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
