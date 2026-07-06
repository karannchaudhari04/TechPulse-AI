package com.techpulse.agent.dto;

import com.techpulse.agent.model.CredibilityLevel;
import com.techpulse.agent.model.CredibilityReason;
import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;

/**
 * Model class encapsulating credibility scoring audit components and confidence levels.
 */
@Value
@Builder
public class CredibilityAssessment {
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
}
