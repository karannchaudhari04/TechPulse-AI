package com.techpulse.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * DTO mapping a list of recommended events grouped by personalized feed names.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalizedFeedDTO {
    private String feedName;
    private List<RecommendationDTO> items;
}
