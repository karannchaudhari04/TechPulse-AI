package com.techpulse.agent.dto;

import lombok.Builder;
import lombok.Value;

/**
 * Immutable DTO representing a provider-independent AI prompt request.
 */
@Value
@Builder
public class AIRequest {
    String model;
    double temperature;
    int maxTokens;
    String systemPrompt;
    String userPrompt;
    String responseSchema;
    String requestId;
}
