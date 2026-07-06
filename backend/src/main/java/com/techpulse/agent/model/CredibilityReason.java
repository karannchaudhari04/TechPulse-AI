package com.techpulse.agent.model;

/**
 * Enumeration representing reasons influencing credibility scoring assessments.
 */
public enum CredibilityReason {
    OFFICIAL_SOURCE,
    CROSS_SOURCE_CONSENSUS,
    CLICKBAIT_PUNCTUATION,
    SPAMMY_KEYWORDS,
    SHORT_CONTENT,
    DEFAULT_FALLBACK
}
