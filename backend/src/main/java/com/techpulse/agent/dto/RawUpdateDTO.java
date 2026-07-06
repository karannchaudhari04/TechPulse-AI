package com.techpulse.agent.dto;

import com.techpulse.agent.model.SourceType;
import lombok.Builder;
import lombok.Value;
import java.time.LocalDateTime;

/**
 * DTO representing raw content collected from a news/tech source by the Discovery Agent.
 */
@Value
@Builder
public class RawUpdateDTO {
    String title;
    String rawContent;
    String sourceUrl;
    String author;
    String thumbnailUrl;
    LocalDateTime publishedAt;
    
    // Extended Metadata
    SourceType sourceType;
    String sourceName;
    LocalDateTime fetchedAt;
    String canonicalUrl;
    String language;
}
