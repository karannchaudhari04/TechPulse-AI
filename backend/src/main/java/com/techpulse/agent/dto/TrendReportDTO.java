package com.techpulse.agent.dto;

import lombok.Builder;
import lombok.Value;

/**
 * DTO carrying trending score, growth rate, and velocity metrics for an entity.
 */
@Value
@Builder
public class TrendReportDTO {
    String entityName;
    String type;
    int currentCount;
    int previousCount;
    double growthRate;
    double velocity;
    double trendScore;
    String trendLabel;
}
