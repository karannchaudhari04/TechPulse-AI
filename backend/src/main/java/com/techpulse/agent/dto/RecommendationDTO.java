package com.techpulse.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO holding a recommended technology event alongside its final score and explainability metadata.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationDTO {
    private String eventId;
    private String title;
    private double score;
    private RecommendationExplanationDTO explanation;
}
