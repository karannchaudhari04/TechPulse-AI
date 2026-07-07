package com.techpulse.service;

import com.techpulse.agent.dto.RecommendationDTO;
import java.util.List;

/**
 * Service interface managing personalization feed recommendations.
 */
public interface RecommendationService {
    List<RecommendationDTO> getRecommendations(Long userId, int limit);
    void evictRecommendations(Long userId);
}
