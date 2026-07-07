package com.techpulse.agent;

import com.techpulse.agent.dto.RecommendationDTO;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.TechnologyEventRepository;
import com.techpulse.repository.UserFollowRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class RecommendationAgentTest {

    private UserFollowRepository userFollowRepository;
    private TechnologyEventRepository technologyEventRepository;
    private ExplainabilityAgent explainabilityAgent;
    private RecommendationAgent recommendationAgent;

    @BeforeEach
    public void setUp() {
        userFollowRepository = mock(UserFollowRepository.class);
        technologyEventRepository = mock(TechnologyEventRepository.class);
        explainabilityAgent = mock(ExplainabilityAgent.class);

        List<ScoringComponent> scorers = Arrays.asList(
                new FreshnessScorer(),
                new ImportanceScorer(),
                new CredibilityScorer()
        );

        recommendationAgent = new RecommendationAgent(
                scorers, userFollowRepository, technologyEventRepository, explainabilityAgent
        );
    }

    @Test
    public void testGetRecommendations() {
        Long userId = 1L;
        TechnologyEvent event = TechnologyEvent.builder()
                .id("event-1")
                .title("Spring GA")
                .importanceScore(0.8)
                .credibilityScore(0.9)
                .entitiesJson("[\"Spring Boot\"]")
                .build();

        when(technologyEventRepository.findAll()).thenReturn(List.of(event));
        when(userFollowRepository.findByUserId(userId)).thenReturn(new ArrayList<>());

        List<RecommendationDTO> recs = recommendationAgent.getRecommendations(userId, 5);
        assertNotNull(recs);
        assertFalse(recs.isEmpty());
        assertEquals("event-1", recs.get(0).getEventId());
    }
}
