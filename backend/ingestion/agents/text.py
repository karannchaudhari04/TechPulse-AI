from __future__ import annotations

import re
from datetime import datetime
from urllib.parse import urlsplit

SOFTWARE_ENGINEERING_SIGNAL = re.compile(
    r"\b(software engineering|software development|software engineer|developer tools?|"
    r"developer platform|developers?|programming|coding|codebase|source code|open source|"
    r"github|gitlab|pull request|code review|repository|repositories|compiler|ide|api|sdk|"
    r"framework|library|libraries|package manager|dependency|dependencies|debugging|"
    r"unit tests?|integration tests?|test automation|test harness|ci/cd|devops|kubernetes|"
    r"docker|terraform|microservices?|serverless|cloud native|system design|"
    r"software architecture|backend|back-end|frontend|front-end|full stack|database|sql|"
    r"java|javascript|typescript|python|kotlin|rust|golang|react native|reactjs|react|"
    r"angular|vuejs|nodejs|spring boot|django|flutter|android developers?|ios developers?|"
    r"linux kernel|secure coding|appsec|cve|software vulnerability|agentic ai|coding agents?)\b",
    re.IGNORECASE | re.UNICODE,
)
DOT_NET_SIGNAL = re.compile(r"\.net\b", re.IGNORECASE)


def is_eligible(
    title: str | None,
    content: str | None,
    published_at: datetime | None,
    now: datetime | None,
) -> bool:
    if published_at is None or now is None:
        return False
    from datetime import timedelta

    cutoff = now - timedelta(hours=24)
    if published_at < cutoff or published_at > now:
        return False
    searchable = f"{title or ''} {content or ''}".strip()
    return bool(
        searchable
        and (
            SOFTWARE_ENGINEERING_SIGNAL.search(searchable)
            or DOT_NET_SIGNAL.search(searchable)
        )
    )


def jaro_winkler(s1: str | None, s2: str | None) -> float:
    if s1 is None or s2 is None:
        return 0.0
    if s1 == s2:
        return 1.0
    s1 = s1.strip()
    s2 = s2.strip()
    if not s1 or not s2:
        return 0.0

    len1, len2 = len(s1), len(s2)
    match_window = max(0, max(len1, len2) // 2 - 1)
    matches1 = [False] * len1
    matches2 = [False] * len2
    matches_count = 0

    for i in range(len1):
        start = max(0, i - match_window)
        end = min(len2 - 1, i + match_window)
        for j in range(start, end + 1):
            if not matches2[j] and s1[i] == s2[j]:
                matches1[i] = True
                matches2[j] = True
                matches_count += 1
                break

    if matches_count == 0:
        return 0.0

    transpositions = 0
    k = 0
    for i in range(len1):
        if matches1[i]:
            while not matches2[k]:
                k += 1
            if s1[i] != s2[k]:
                transpositions += 1
            k += 1

    jaro = (1.0 / 3.0) * (
        (matches_count / len1)
        + (matches_count / len2)
        + ((matches_count - transpositions // 2) / matches_count)
    )

    prefix_len = 0
    for i in range(min(4, min(len1, len2))):
        if s1[i] == s2[i]:
            prefix_len += 1
        else:
            break

    jaro_winkler_score = jaro + 0.1 * prefix_len * (1.0 - jaro)
    return round(jaro_winkler_score * 100.0) / 100.0


TECHNICAL_DETAIL = re.compile(
    r"\b(api|sdk|framework|library|database|compiler|runtime|kernel|protocol|"
    r"architecture|deployment|benchmark|latency|throughput|vulnerability|CVE|release|"
    r"version|open.source|repository|dependency|breaking change|migration|performance|"
    r"security patch|patch)\b",
    re.IGNORECASE,
)
STRONG_UPDATE = re.compile(
    r"\b(released?|launch(?:ed)?|announc(?:ed|es)|introduc(?:ed|es)|ships?|GA|"
    r"generally available|deprecated|sunset|CVE-\d{4}-\d+|vulnerability|breaking change|"
    r"patch(?:ed)?|open.source)\b",
    re.IGNORECASE,
)
PROMOTIONAL_OR_LOW_SIGNAL = re.compile(
    r"\b(webinar|sponsored|partner content|press release|fundrais(?:e|ing)|raises? \$|"
    r"hiring|job opening|stock price|market share|top \d+|best \d+|opinion|"
    r"weekly roundup)\b",
    re.IGNORECASE,
)
TRUSTED_TECH_DOMAINS = [
    "github.blog",
    "github.com",
    "cloud.google.com",
    "developers.googleblog.com",
    "blog.google",
    "aws.amazon.com",
    "aws.com",
    "engineering.fb.com",
    "developer.apple.com",
    "learn.microsoft.com",
    "techcommunity.microsoft.com",
    "netflixtechblog.com",
    "engineering.linkedin.com",
    "openai.com",
    "anthropic.com",
    "cloudflare.com",
    "kubernetes.io",
    "cncf.io",
    "spring.io",
    "mozilla.org",
    "arstechnica.com",
    "theverge.com",
    "techcrunch.com",
    "infoq.com",
    "theregister.com",
    "thenewstack.io",
    "bleepingcomputer.com",
    "darkreading.com",
    "snyk.io",
    "zdnet.com",
]
MAX_PER_SOURCE = 4


def _host(url: str | None) -> str:
    if not url or not str(url).strip():
        return ""
    try:
        host = urlsplit(url).hostname or ""
    except Exception:
        return ""
    host = host.lower()
    return host[4:] if host.startswith("www.") else host


def _source_name(article) -> str:
    source = str(article.source_name or "").strip().lower()
    return source if source else _host(article.url)


def _score(article, now: datetime) -> int:
    title = article.title or ""
    content = article.raw_content or ""
    text = f"{title} {content}"
    score = 20

    host = _host(article.url)
    if any(host == domain or host.endswith("." + domain) for domain in TRUSTED_TECH_DOMAINS):
        score += 30
    technical_matches = len(TECHNICAL_DETAIL.findall(text))
    if technical_matches > 0:
        score += 10
    score += min(18, technical_matches * 3)
    if STRONG_UPDATE.search(text):
        score += 15
    if len(content) >= 250:
        score += 5
    if PROMOTIONAL_OR_LOW_SIGNAL.search(text):
        score -= 30
    if article.published_at is not None:
        age_minutes = max(0, int((now - article.published_at).total_seconds() // 60))
        score += max(0, 12 - age_minutes // 120)
    return score


def select_top_articles(articles: list, limit: int) -> list:
    now = datetime.now()
    ranked = list(articles)
    # Stable multi-pass sort: URL asc (nulls last), published desc (nulls last),
    # then editorial score desc.
    ranked.sort(key=lambda article: (article.url is None, article.url or ""))
    ranked.sort(key=lambda article: article.published_at or datetime.min, reverse=True)
    ranked.sort(key=lambda article: _score(article, now), reverse=True)

    selected = []
    source_counts: dict[str, int] = {}
    for article in ranked:
        source = _source_name(article)
        count = source_counts.get(source, 0)
        if count >= MAX_PER_SOURCE:
            continue
        selected.append(article)
        source_counts[source] = count + 1
        if len(selected) >= limit:
            break
    return selected
