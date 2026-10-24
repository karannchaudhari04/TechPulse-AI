package com.techpulse.agent.util;

import java.time.LocalDateTime;
import java.util.regex.Pattern;

/**
 * Deterministic ingestion gate: accepts only verifiably recent, software-engineering updates.
 * This intentionally does not call an LLM, so filtering does not consume Gemini quota.
 */
public final class UpdateEligibilityFilter {

    private static final Pattern SOFTWARE_ENGINEERING_SIGNAL = Pattern.compile(
            "\\b(software engineering|software development|software engineer|developer tools?|developer platform|developers?|programming|coding|codebase|source code|open source|github|gitlab|pull request|code review|repository|repositories|compiler|ide|api|sdk|framework|library|libraries|package manager|dependency|dependencies|debugging|unit tests?|integration tests?|test automation|test harness|ci/cd|devops|kubernetes|docker|terraform|microservices?|serverless|cloud native|system design|software architecture|backend|back-end|frontend|front-end|full stack|database|sql|java|javascript|typescript|python|kotlin|rust|golang|react native|reactjs|react|angular|vuejs|nodejs|spring boot|django|flutter|android developers?|ios developers?|linux kernel|secure coding|appsec|cve|software vulnerability|agentic ai|coding agents?)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private static final Pattern DOT_NET_SIGNAL = Pattern.compile("\\.net\\b", Pattern.CASE_INSENSITIVE);

    private UpdateEligibilityFilter() {}

    public static boolean isEligible(String title, String content, LocalDateTime publishedAt, LocalDateTime now) {
        if (publishedAt == null || now == null) {
            return false;
        }

        LocalDateTime cutoff = now.minusHours(24);
        if (publishedAt.isBefore(cutoff) || publishedAt.isAfter(now)) {
            return false;
        }

        String searchableText = ((title == null ? "" : title) + " " + (content == null ? "" : content)).trim();
        return !searchableText.isEmpty() && (SOFTWARE_ENGINEERING_SIGNAL.matcher(searchableText).find()
                || DOT_NET_SIGNAL.matcher(searchableText).find());
    }
}
