package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.dto.RecommendationExplanationDTO;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.model.UserFollow;
import com.techpulse.repository.UserFollowRepository;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Agent providing user-friendly explainability reasoning for recommended events.
 */
@Service
public class ExplainabilityAgent {

    private final UserFollowRepository userFollowRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ExplainabilityAgent(UserFollowRepository userFollowRepository) {
        this.userFollowRepository = userFollowRepository;
    }

    /**
     * Resolves follow statuses, credibility parameters, and importance values to construct explanation reasons.
     */
    public RecommendationExplanationDTO explain(TechnologyEvent event, Long userId, double finalScore, Map<String, Double> scoreBreakdown) {
        List<String> reasons = new ArrayList<>();

        if (userId != null) {
            List<UserFollow> follows = userFollowRepository.findByUserId(userId);
            List<?> eventEntities = new ArrayList<>();
            if (event.getEntitiesJson() != null) {
                try {
                    eventEntities = objectMapper.readValue(event.getEntitiesJson(), List.class);
                } catch (Exception ignored) {}
            }

            for (Object entObj : eventEntities) {
                String ent = String.valueOf(entObj);
                boolean followsEnt = follows.stream().anyMatch(f -> f.getEntityName().equalsIgnoreCase(ent));
                if (followsEnt) {
                    reasons.add("follows " + ent);
                }
            }
        }

        if ("GA".equalsIgnoreCase(event.getLifecycleStatus()) || "RELEASE".equalsIgnoreCase(event.getLifecycleStatus())) {
            reasons.add("official release announcement");
        }

        if (event.getCredibilityScore() != null && event.getCredibilityScore() > 0.8) {
            reasons.add("high credibility");
        }

        Double trendVal = scoreBreakdown.get("trendScore");
        if (trendVal != null && trendVal > 0.6) {
            reasons.add("trending");
        }

        if (event.getSecurityNotes() != null && !event.getSecurityNotes().equalsIgnoreCase("Not confirmed.")) {
            reasons.add("security update");
        }

        if (event.getImportanceScore() != null) {
            reasons.add("importance score " + String.format("%.2f", event.getImportanceScore()));
        }

        return RecommendationExplanationDTO.builder()
                .reasons(reasons)
                .finalScore(finalScore)
                .scoreBreakdown(scoreBreakdown)
                .build();
    }
}
