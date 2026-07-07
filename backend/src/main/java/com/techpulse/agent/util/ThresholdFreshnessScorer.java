package com.techpulse.agent.util;

import com.techpulse.agent.config.ImportanceProperties;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Threshold-based freshness scorer conforming to configured properties limits.
 */
public class ThresholdFreshnessScorer implements FreshnessScorer {

    private final ImportanceProperties.FreshnessProperties config;

    public ThresholdFreshnessScorer(ImportanceProperties.FreshnessProperties config) {
        this.config = config;
    }

    @Override
    public double calculateFreshnessScore(LocalDateTime publishedAt, LocalDateTime currentExecutionTime) {
        if (publishedAt == null || currentExecutionTime == null) {
            return 0.0;
        }
        long hours = Duration.between(publishedAt, currentExecutionTime).toHours();
        if (hours < 0) {
            hours = 0;
        }
        if (hours <= 1) {
            return config.getFirstHour();
        } else if (hours <= 24) {
            return config.getFirstDay();
        } else if (hours <= 168) {
            return config.getFirstWeek();
        }
        return 0.0;
    }
}
