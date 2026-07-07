package com.techpulse.agent;

import com.techpulse.agent.dto.RecommendationExplanationDTO;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.UserFollowRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class ExplainabilityAgentTest {

    private UserFollowRepository userFollowRepository;
    private ExplainabilityAgent explainabilityAgent;

    @BeforeEach
    public void setUp() {
        userFollowRepository = mock(UserFollowRepository.class);
        explainabilityAgent = new ExplainabilityAgent(userFollowRepository);
    }

    @Test
    public void testExplain() {
        TechnologyEvent event = TechnologyEvent.builder()
                .id("event-1")
                .title("Oracle Java 25 Released")
                .lifecycleStatus("GA")
                .entitiesJson("[\"Java\"]")
                .credibilityScore(0.95)
                .importanceScore(0.85)
                .build();

        Map<String, Double> breakdown = new HashMap<>();
        breakdown.put("trendScore", 0.7);

        RecommendationExplanationDTO explanation = explainabilityAgent.explain(event, 1L, 0.95, breakdown);
        assertNotNull(explanation);
        assertTrue(explanation.getReasons().contains("official release announcement"));
        assertTrue(explanation.getReasons().contains("high credibility"));
        assertTrue(explanation.getReasons().contains("trending"));
    }
}
