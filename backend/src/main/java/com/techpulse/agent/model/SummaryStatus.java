package com.techpulse.agent.model;

/**
 * Enumeration representing the lifecycle state of an AI summary.
 */
public enum SummaryStatus {
    NEW,
    GENERATING,
    READY,
    FAILED,
    STALE,
    CACHED
}
