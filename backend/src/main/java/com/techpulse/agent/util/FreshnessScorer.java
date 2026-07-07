package com.techpulse.agent.util;

import java.time.LocalDateTime;

/**
 * Interface defining freshness score evaluation algorithms.
 */
public interface FreshnessScorer {
    double calculateFreshnessScore(LocalDateTime publishedAt, LocalDateTime currentExecutionTime);
}
