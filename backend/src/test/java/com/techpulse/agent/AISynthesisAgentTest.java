package com.techpulse.agent;

import com.techpulse.agent.dto.*;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.TechnologyEventRepository;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test validating AISynthesisAgent generation, validation, and caching orchestrations.
 */
public class AISynthesisAgentTest {

    @Test
    public void testAISynthesisWorkflow() {
        AIClient client = mock(AIClient.class);
        PromptTemplateService promptService = new PromptTemplateService();
        PromptContextFactory contextFactory = mock(PromptContextFactory.class);
        PromptRenderer renderer = new PromptRenderer();
        AIResponseParser parser = new AIResponseParser();
        HallucinationValidator validator = mock(HallucinationValidator.class);
        SummaryCache cache = new SummaryCache();
        AIMetricsCollector metrics = new AIMetricsCollector();
        TechnologyEventRepository repo = mock(TechnologyEventRepository.class);

        when(contextFactory.createContext(any())).thenReturn(
                PromptContext.builder().title("Spring Boot").entities("[\"Spring Boot\"]").build()
        );

        String jsonResponse = "{\n" +
                "  \"headline\": \"Spring Boot Release\",\n" +
                "  \"summary\": \"Some summary text here.\",\n" +
                "  \"technicalImpact\": \"Technical impact details.\",\n" +
                "  \"developerImpact\": \"Developer impact details.\",\n" +
                "  \"enterpriseImpact\": \"Enterprise impact details.\",\n" +
                "  \"migrationNotes\": \"Migration notes.\",\n" +
                "  \"breakingChanges\": \"None\",\n" +
                "  \"securityNotes\": \"None\",\n" +
                "  \"officialLinks\": [\"http://foo.com/sb\"],\n" +
                "  \"keyTakeaways\": [\"GA release\"],\n" +
                "  \"recommendedActions\": [\"Upgrade\"],\n" +
                "  \"confidenceExplanation\": \"Verified release\"\n" +
                "}";

        when(client.generate(any())).thenReturn(
                AIResponse.builder()
                        .content(jsonResponse)
                        .promptTokens(100)
                        .completionTokens(200)
                        .latency(300L)
                        .provider("Mock")
                        .build()
        );

        AISynthesisAgent agent = new AISynthesisAgent(
                client, promptService, contextFactory, renderer, parser, validator, cache, metrics, repo
        );

        TechnologyEvent event = TechnologyEvent.builder()
                .id("ev-123")
                .title("Spring Boot")
                .entitiesJson("[\"Spring Boot\"]")
                .build();

        TechnologyEventDTO dto = TechnologyEventDTO.builder()
                .event(event)
                .supportingUpdates(new ArrayList<>())
                .build();

        SynthesizedTechnologyEventDTO result = agent.process(dto);

        assertNotNull(result);
        assertEquals("Spring Boot Release", result.getHeadline());
        assertEquals("READY", result.getStatus());
        verify(repo, times(2)).save(any());
    }
}
