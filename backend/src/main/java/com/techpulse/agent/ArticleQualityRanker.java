package com.techpulse.agent;

import com.techpulse.model.RawIngestion;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;

/** Deterministic editorial ranking applied before any paid AI synthesis calls. */
final class ArticleQualityRanker {

    private static final Pattern TECHNICAL_DETAIL = Pattern.compile(
            "\\b(api|sdk|framework|library|database|compiler|runtime|kernel|protocol|architecture|deployment|benchmark|latency|throughput|vulnerability|CVE|release|version|open.source|repository|dependency|breaking change|migration|performance|security patch|patch)\\b",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern STRONG_UPDATE = Pattern.compile(
            "\\b(released?|launch(?:ed)?|announc(?:ed|es)|introduc(?:ed|es)|ships?|GA|generally available|deprecated|sunset|CVE-\\d{4}-\\d+|vulnerability|breaking change|patch(?:ed)?|open.source)\\b",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern PROMOTIONAL_OR_LOW_SIGNAL = Pattern.compile(
            "\\b(webinar|sponsored|partner content|press release|fundrais(?:e|ing)|raises? \\$|hiring|job opening|stock price|market share|top \\d+|best \\d+|opinion|weekly roundup)\\b",
            Pattern.CASE_INSENSITIVE);
    private static final List<String> TRUSTED_TECH_DOMAINS = List.of(
            "github.blog", "github.com", "cloud.google.com", "developers.googleblog.com", "blog.google",
            "aws.amazon.com", "aws.com", "engineering.fb.com", "developer.apple.com", "learn.microsoft.com",
            "techcommunity.microsoft.com", "netflixtechblog.com", "engineering.linkedin.com", "openai.com",
            "anthropic.com", "cloudflare.com", "kubernetes.io", "cncf.io", "spring.io", "mozilla.org",
            "arstechnica.com", "theverge.com", "techcrunch.com", "infoq.com", "theregister.com",
            "thenewstack.io", "bleepingcomputer.com", "darkreading.com", "snyk.io", "zdnet.com");
    private static final int MAX_PER_SOURCE = 4;

    private ArticleQualityRanker() {}

    static List<RawIngestion> selectTopArticles(List<RawIngestion> articles, int limit) {
        LocalDateTime now = LocalDateTime.now();
        List<RawIngestion> ranked = new ArrayList<>(articles);
        ranked.sort(Comparator
                .comparingInt((RawIngestion article) -> score(article, now)).reversed()
                .thenComparing(RawIngestion::getPublishedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(RawIngestion::getUrl, Comparator.nullsLast(String::compareTo)));

        List<RawIngestion> selected = new ArrayList<>(Math.min(limit, ranked.size()));
        Map<String, Integer> sourceCounts = new HashMap<>();
        for (RawIngestion article : ranked) {
            String source = normalizeSource(article);
            int count = sourceCounts.getOrDefault(source, 0);
            if (count >= MAX_PER_SOURCE) continue;
            selected.add(article);
            sourceCounts.put(source, count + 1);
            if (selected.size() >= limit) break;
        }
        return selected;
    }

    private static int score(RawIngestion article, LocalDateTime now) {
        String title = Objects.toString(article.getTitle(), "");
        String content = Objects.toString(article.getRawContent(), "");
        String text = title + " " + content;
        int score = 20;

        String host = host(article.getUrl());
        if (TRUSTED_TECH_DOMAINS.stream().anyMatch(domain -> host.equals(domain) || host.endsWith("." + domain))) {
            score += 30;
        }
        if (TECHNICAL_DETAIL.matcher(text).results().count() > 0) score += 10;
        score += (int) Math.min(18, TECHNICAL_DETAIL.matcher(text).results().count() * 3);
        if (STRONG_UPDATE.matcher(text).find()) score += 15;
        if (content.length() >= 250) score += 5;
        if (PROMOTIONAL_OR_LOW_SIGNAL.matcher(text).find()) score -= 30;
        if (article.getPublishedAt() != null) {
            long ageMinutes = Math.max(0, Duration.between(article.getPublishedAt(), now).toMinutes());
            score += Math.max(0, 12 - (int) (ageMinutes / 120));
        }
        return score;
    }

    private static String normalizeSource(RawIngestion article) {
        String source = Objects.toString(article.getSourceName(), "").trim().toLowerCase(Locale.ROOT);
        return source.isEmpty() ? host(article.getUrl()) : source;
    }

    private static String host(String url) {
        if (url == null || url.isBlank()) return "";
        try {
            String host = java.net.URI.create(url).getHost();
            return host == null ? "" : host.toLowerCase(Locale.ROOT).replaceFirst("^www\\.", "");
        } catch (IllegalArgumentException ignored) {
            return "";
        }
    }
}
