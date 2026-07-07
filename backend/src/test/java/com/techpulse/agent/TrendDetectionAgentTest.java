package com.techpulse.agent;

import com.techpulse.agent.dto.TrendReportDTO;
import com.techpulse.model.KgNode;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.KgNodeRepository;
import com.techpulse.repository.TechnologyEventRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test validating TrendDetectionAgent trending scoring metrics and status labels.
 */
public class TrendDetectionAgentTest {

    @Test
    public void testTrendScoreAndLabelVelocityCalculation() {
        KgNodeRepository nodeRepo = mock(KgNodeRepository.class);
        TechnologyEventRepository eventRepo = mock(TechnologyEventRepository.class);

        KgNode javaNode = KgNode.builder().id("1").name("Java").normalizedName("java").type("LANGUAGE").mentionCount(1).build();
        when(nodeRepo.findAll()).thenReturn(List.of(javaNode));

        LocalDateTime now = LocalDateTime.now();
        
        TechnologyEvent ev1 = TechnologyEvent.builder().entitiesJson("[\"Java\"]").lastUpdated(now.minusDays(1)).credibilityScore(0.9).importanceScore(0.8).build();
        TechnologyEvent ev2 = TechnologyEvent.builder().entitiesJson("[\"Java\"]").lastUpdated(now.minusDays(2)).credibilityScore(0.9).importanceScore(0.8).build();
        TechnologyEvent ev3 = TechnologyEvent.builder().entitiesJson("[\"Java\"]").lastUpdated(now.minusDays(3)).credibilityScore(0.9).importanceScore(0.8).build();
        TechnologyEvent ev4 = TechnologyEvent.builder().entitiesJson("[\"Java\"]").lastUpdated(now.minusDays(4)).credibilityScore(0.9).importanceScore(0.8).build();
        TechnologyEvent ev5 = TechnologyEvent.builder().entitiesJson("[\"Java\"]").lastUpdated(now.minusDays(5)).credibilityScore(0.9).importanceScore(0.8).build();

        TechnologyEvent ev6 = TechnologyEvent.builder().entitiesJson("[\"Java\"]").lastUpdated(now.minusDays(9)).credibilityScore(0.8).importanceScore(0.8).build();
        TechnologyEvent ev7 = TechnologyEvent.builder().entitiesJson("[\"Java\"]").lastUpdated(now.minusDays(10)).credibilityScore(0.8).importanceScore(0.8).build();

        when(eventRepo.findAll()).thenReturn(List.of(ev1, ev2, ev3, ev4, ev5, ev6, ev7));

        TrendDetectionAgent agent = new TrendDetectionAgent(nodeRepo, eventRepo);

        List<TrendReportDTO> trends = agent.calculateTrends();

        assertEquals(1, trends.size());
        TrendReportDTO report = trends.get(0);

        assertEquals("Java", report.getEntityName());
        assertEquals(5, report.getCurrentCount());
        assertEquals(2, report.getPreviousCount());
        assertTrue(report.getGrowthRate() > 0.0);
        assertTrue(report.getTrendScore() > 0.0);
        assertNotNull(report.getTrendLabel());
    }
}
