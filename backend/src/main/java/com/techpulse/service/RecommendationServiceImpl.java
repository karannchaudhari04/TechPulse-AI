package com.techpulse.service;

import com.techpulse.agent.RecommendationAgent;
import com.techpulse.agent.dto.RecommendationDTO;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service implementation delegating personalization recommendations to the RecommendationAgent with cache supports.
 */
@Service
public class RecommendationServiceImpl implements RecommendationService {

    private final RecommendationAgent recommendationAgent;

    public RecommendationServiceImpl(RecommendationAgent recommendationAgent) {
        this.recommendationAgent = recommendationAgent;
    }

    @Override
    @Cacheable(value = "recommendations", key = "#userId != null ? #userId + ':' + #limit : 'anon:' + #limit", unless = "#result == null")
    public List<RecommendationDTO> getRecommendations(Long userId, int limit) {
        return recommendationAgent.getRecommendations(userId, limit);
    }

    @Override
    @CacheEvict(value = "recommendations", allEntries = true)
    public void evictRecommendations(Long userId) {
        // Evicts all recommendation cache keys on updates
    }
}
