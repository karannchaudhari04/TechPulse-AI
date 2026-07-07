package com.techpulse.agent.dto;

import com.techpulse.agent.model.CredibilityLevel;
import com.techpulse.agent.model.CredibilityReason;
import lombok.Builder;
import lombok.Value;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Model class encapsulating credibility scoring audit components and confidence levels.
 */
@Value
@Builder
public class CredibilityAssessment implements ScoreAssessment {
    double score;
    double confidence;
    boolean official;
    CredibilityLevel level;
    List<CredibilityReason> reasons;
    List<String> evidence;

    // Breakdown components
    double baselineWeight;
    double officialBonus;
    double agreementBonus;
    double clickbaitPenalty;

    // Extensibility placeholder
    Map<String, Object> additionalSignals;

    @Override
    public Map<String, Double> getScoreBreakdown() {
        Map<String, Double> breakdown = new HashMap<>();
        breakdown.put("baselineWeight", baselineWeight);
        breakdown.put("officialBonus", officialBonus);
        breakdown.put("agreementBonus", agreementBonus);
        breakdown.put("clickbaitPenalty", clickbaitPenalty);
        return breakdown;
    }

    @Override
    public Map<String, Object> getMetadata() {
        return additionalSignals;
    }
}
