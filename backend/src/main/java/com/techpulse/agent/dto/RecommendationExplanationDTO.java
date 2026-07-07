package com.techpulse.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

/**
 * DTO detailing explainability factors for recommended events.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationExplanationDTO {
    private List<String> reasons;
    private double finalScore;
    private Map<String, Double> scoreBreakdown;
}
