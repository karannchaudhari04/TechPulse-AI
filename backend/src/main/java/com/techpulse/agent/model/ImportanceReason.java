package com.techpulse.agent.model;

/**
 * Enumeration representing reasons influencing importance scoring assessments.
 */
public enum ImportanceReason {
    OFFICIAL_RELEASE,
    MULTIPLE_ORGANIZATIONS,
    HIGH_CATEGORY_WEIGHT,
    BREAKING_CHANGE,
    SECURITY_UPDATE,
    VERY_RECENT,
    LARGE_IMPACT,
    MAJOR_RELEASE,
    NEW_FRAMEWORK,
    NEW_MODEL,
    COMMUNITY_SIGNAL,
    DEFAULT_BASELINE
}
