package com.techpulse.agent.dto;

import com.techpulse.agent.model.SourceType;
import lombok.Builder;
import lombok.Value;
import java.time.LocalDateTime;

/**
 * DTO representing cleaned content, stripped of HTML tags and URL tracking parameters.
 */
@Value
@Builder
public class CleanedUpdateDTO {
    String title;
    String cleanedContent;
    String sourceUrl;
    String author;
    String thumbnailUrl;
    LocalDateTime publishedAt;
    
    SourceType sourceType;
    String sourceName;
    LocalDateTime fetchedAt;
    String canonicalUrl;
    String language;
}
