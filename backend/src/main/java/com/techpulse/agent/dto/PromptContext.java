package com.techpulse.agent.dto;

import lombok.Builder;
import lombok.Value;

/**
 * Parameter context DTO holding strings compiled for LLM prompts.
 */
@Value
@Builder
public class PromptContext {
    String title;
    String version;
    String categories;
    String credibilityScore;
    String importanceScore;
    String timeline;
    String graph;
    String trend;
    String entities;
}
