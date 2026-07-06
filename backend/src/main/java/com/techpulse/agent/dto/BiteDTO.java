package com.techpulse.agent.dto;

import lombok.Builder;
import lombok.Value;
import java.time.LocalDateTime;

/**
 * DTO representing the fully generated tech bite post-summarization.
 */
@Value
@Builder
public class BiteDTO {
    String title;
    String contentSummary;
    String contentDescription;
    String sourceUrl;
    String author;
    String thumbnailUrl;
    String categoryName;
    double credibilityScore;
    double importanceScore;
    LocalDateTime publishedAt;
}
