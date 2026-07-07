package com.techpulse.agent.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Immutable DTO holding the complete, synthesized event intelligence along with LLM metadata.
 */
@Value
@Builder
public class SynthesizedTechnologyEventDTO {
    String headline;
    String summary;
    String technicalImpact;
    String developerImpact;
    String enterpriseImpact;
    String migrationNotes;
    String breakingChanges;
    String securityNotes;
    List<String> officialLinks;
    List<String> keyTakeaways;
    List<String> recommendedActions;
    String confidenceExplanation;

    LocalDateTime generatedAt;
    String promptVersion;
    String modelName;
    int promptTokens;
    int completionTokens;
    long latency;
    double estimatedCostUsd;
    double estimatedCostInr;
    String status;
}
