package com.techpulse.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * DTO matching query text against events using relevance ranker matching reasons.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResultDTO {
    private String eventId;
    private String title;
    private double relevanceScore;
    private List<String> matchReasons;
}
