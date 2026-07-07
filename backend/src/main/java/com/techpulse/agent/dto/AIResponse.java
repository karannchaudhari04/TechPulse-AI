package com.techpulse.agent.dto;

import lombok.Builder;
import lombok.Value;

/**
 * Immutable DTO representing a provider-independent response from an AI service.
 */
@Value
@Builder
public class AIResponse {
    String content;
    String model;
    int promptTokens;
    int completionTokens;
    String finishReason;
    long latency;
    String provider;
    String rawResponse;
}
