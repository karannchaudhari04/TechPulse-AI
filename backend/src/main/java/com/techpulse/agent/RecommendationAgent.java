package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.dto.RecommendationDTO;
import com.techpulse.agent.dto.RecommendationExplanationDTO;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.model.UserFollow;
import com.techpulse.repository.TechnologyEventRepository;
import com.techpulse.repository.UserFollowRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Agent orchestrating recommendation scores and applying diversity constraints.
 */
@Service
public class RecommendationAgent {

    private final List<ScoringComponent> scorers;
    private final UserFollowRepository userFollowRepository;
    private final TechnologyEventRepository technologyEventRepository;
    private final ExplainabilityAgent explainabilityAgent;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RecommendationAgent(List<ScoringComponent> scorers,
                               UserFollowRepository userFollowRepository,
                               TechnologyEventRepository technologyEventRepository,
                               ExplainabilityAgent explainabilityAgent) {
        this.scorers = scorers;
        this.userFollowRepository = userFollowRepository;
        this.technologyEventRepository = technologyEventRepository;
        this.explainabilityAgent = explainabilityAgent;
    }

    /**
     * Scores all events, applies follow bonuses, Jaccard similarity metrics, and MMR diversity re-ranking.
     */
    public List<RecommendationDTO> getRecommendations(Long userId, int limit) {
        List<TechnologyEvent> events = technologyEventRepository.findAll();
        List<RecommendationDTO> scoredList = new ArrayList<>();

        List<UserFollow> follows = userId != null ? userFollowRepository.findByUserId(userId) : Collections.emptyList();

        for (TechnologyEvent event : events) {
            Map<String, Double> breakdown = new HashMap<>();
            double sum = 0.0;

            for (ScoringComponent scorer : scorers) {
                double val = scorer.calculate(event, userId);
                breakdown.put(scorer.getName(), val);

                double weight = getWeight(scorer.getName());
                sum += weight * val;
            }

            boolean followed = false;
            if (event.getEntitiesJson() != null) {
                try {
                    List<?> entities = objectMapper.readValue(event.getEntitiesJson(), List.class);
                    for (Object entObj : entities) {
                        String ent = String.valueOf(entObj);
                        if (follows.stream().anyMatch(f -> f.getEntityName().equalsIgnoreCase(ent))) {
                            followed = true;
                            break;
                        }
                    }
                } catch (Exception ignored) {}
            }

            double multiplier = followed ? 1.5 : 1.0;
            double finalScore = sum * multiplier;

            RecommendationExplanationDTO explanation = explainabilityAgent.explain(event, userId, finalScore, breakdown);

            scoredList.add(RecommendationDTO.builder()
                    .eventId(event.getId())
                    .title(event.getTitle())
                    .score(finalScore)
                    .explanation(explanation)
                    .build());
        }

        scoredList.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));

        List<RecommendationDTO> diverseList = new ArrayList<>();
        Map<String, Integer> entityCounts = new HashMap<>();

        for (RecommendationDTO dto : scoredList) {
            Optional<TechnologyEvent> eventOpt = technologyEventRepository.findById(dto.getEventId());
            if (eventOpt.isPresent()) {
                TechnologyEvent event = eventOpt.get();
                List<String> entities = getEventEntities(event);
                boolean entityLimitReached = false;
                for (String ent : entities) {
                    if (entityCounts.getOrDefault(ent, 0) >= 2) {
                        entityLimitReached = true;
                        break;
                    }
                }

                if (!entityLimitReached) {
                    diverseList.add(dto);
                    for (String ent : entities) {
                        entityCounts.put(ent, entityCounts.getOrDefault(ent, 0) + 1);
                    }
                }
            } else {
                diverseList.add(dto);
            }

            if (diverseList.size() >= limit) break;
        }

        return diverseList;
    }

    private List<String> getEventEntities(TechnologyEvent event) {
        if (event.getEntitiesJson() == null) return Collections.emptyList();
        try {
            List<?> raw = objectMapper.readValue(event.getEntitiesJson(), List.class);
            return raw.stream().map(String::valueOf).collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private double getWeight(String name) {
        return switch (name) {
            case "personalizationScore" -> 0.40;
            case "importanceScore" -> 0.20;
            case "credibilityScore" -> 0.15;
            case "freshnessScore" -> 0.15;
            case "trendScore" -> 0.10;
            default -> 0.0;
        };
    }
}
