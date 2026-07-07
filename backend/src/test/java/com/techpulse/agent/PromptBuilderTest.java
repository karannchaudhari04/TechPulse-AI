package com.techpulse.agent;

import com.techpulse.agent.dto.PromptContext;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.EventTimelineRepository;
import com.techpulse.repository.KgEdgeRepository;
import com.techpulse.repository.KgNodeRepository;
import org.junit.jupiter.api.Test;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test validating PromptContextFactory compiled prompt contexts.
 */
public class PromptBuilderTest {

    @Test
    public void testPromptContextCreation() {
        EventTimelineRepository timelineRepo = mock(EventTimelineRepository.class);
        KgNodeRepository nodeRepo = mock(KgNodeRepository.class);
        KgEdgeRepository edgeRepo = mock(KgEdgeRepository.class);

        when(timelineRepo.findAll()).thenReturn(Collections.emptyList());
        when(nodeRepo.findAll()).thenReturn(Collections.emptyList());
        when(edgeRepo.findAll()).thenReturn(Collections.emptyList());

        PromptContextFactory factory = new PromptContextFactory(timelineRepo, nodeRepo, edgeRepo);

        TechnologyEvent event = TechnologyEvent.builder()
                .id("ev-123")
                .title("Spring Boot Release")
                .versionString("v3.2.0")
                .categoriesJson("[\"SYSTEM_DESIGN_BACKEND\"]")
                .credibilityScore(0.9)
                .importanceScore(0.8)
                .entitiesJson("[\"Spring Boot\"]")
                .build();

        PromptContext context = factory.createContext(event);

        assertEquals("Spring Boot Release", context.getTitle());
        assertEquals("v3.2.0", context.getVersion());
        assertEquals("0.9", context.getCredibilityScore());
        assertEquals("0.8", context.getImportanceScore());
        assertEquals("Not confirmed.", context.getTimeline());
        assertEquals("Not confirmed.", context.getGraph());
    }
}
