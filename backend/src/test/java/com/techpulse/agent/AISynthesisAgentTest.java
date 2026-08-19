package com.techpulse.agent;

import com.techpulse.agent.dto.AIRequest;
import com.techpulse.agent.dto.AIResponse;
import com.techpulse.model.RawIngestion;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.RawIngestionRepository;
import com.techpulse.repository.TechnologyEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class AISynthesisAgentTest {

    private AIClient aiClient;
    private TechnologyEventRepository technologyEventRepository;
    private RawIngestionRepository rawIngestionRepository;
    private AISynthesisAgent aiSynthesisAgent;

    @BeforeEach
    public void setUp() {
        aiClient = mock(AIClient.class);
        technologyEventRepository = mock(TechnologyEventRepository.class);
        rawIngestionRepository = mock(RawIngestionRepository.class);
        aiSynthesisAgent = new AISynthesisAgent(aiClient, technologyEventRepository, rawIngestionRepository);
    }

    @Test
    public void testSynthesizeAndSaveSuccess() {
        RawIngestion raw = new RawIngestion();
        raw.setId("raw-123");
        raw.setEventId("event-123");
        raw.setTitle("Docker Desktop release");
        raw.setRawContent("A new docker desktop version is out with security enhancements.");
        raw.setUrl("http://docker.com/release");

        String jsonResponse = "{\n" +
                "  \"title\": \"Docker Desktop Security Release\",\n" +
                "  \"summary\": \"A security update has been released.\",\n" +
                "  \"category\": \"Cloud & DevOps\",\n" +
                "  \"topics\": [\"Docker\", \"Security\"],\n" +
                "  \"importanceScore\": 85.0,\n" +
                "  \"credibilityScore\": 90.0,\n" +
                "  \"versionString\": \"4.30.0\",\n" +
                "  \"lifecycleStatus\": \"RELEASED\",\n" +
                "  \"technicalImpact\": \"Improves hypervisor isolation.\",\n" +
                "  \"developerImpact\": \"Needs minor configuration adjustments.\",\n" +
                "  \"enterpriseImpact\": \"Low impact risk.\",\n" +
                "  \"migrationNotes\": \"Not confirmed.\",\n" +
                "  \"breakingChanges\": \"None\",\n" +
                "  \"securityNotes\": \"Fixes local privilege escalation.\",\n" +
                "  \"officialLinks\": [\"http://docker.com/sec-notes\"]\n" +
                "}";

        when(aiClient.generate(any(AIRequest.class))).thenReturn(
                AIResponse.builder()
                        .content(jsonResponse)
                        .promptTokens(120)
                        .completionTokens(180)
                        .latency(250L)
                        .provider("Gemini")
                        .build()
        );

        TechnologyEvent event = aiSynthesisAgent.synthesizeAndSave(raw);

        assertNotNull(event);
        assertEquals("Docker Desktop Security Release", event.getTitle());
        assertEquals("event-123", event.getId());
        assertEquals(85.0, event.getImportanceScore());
        assertEquals(90.0, event.getCredibilityScore());

        verify(technologyEventRepository, times(1)).save(any(TechnologyEvent.class));
        verify(rawIngestionRepository, times(1)).save(raw);
        assertEquals(RawIngestion.ProcessingStatus.PROCESSED, raw.getProcessingStatus());
    }

    @Test
    public void testSynthesizeFallbackCategoryAndMissingFields() {
        RawIngestion raw = new RawIngestion();
        raw.setId("raw-456");
        raw.setEventId("event-456");
        raw.setTitle("Vague technology announcement");
        raw.setRawContent("Short text description about something obscure.");

        // Category is missing or invalid -> fallback to "Emerging Tech"
        String jsonResponse = "{\n" +
                "  \"title\": \"Vague announcement\",\n" +
                "  \"summary\": \"Summary description.\",\n" +
                "  \"category\": \"Obscure Category\",\n" +
                "  \"topics\": [],\n" +
                "  \"technicalImpact\": \"None.\",\n" +
                "  \"developerImpact\": \"None.\",\n" +
                "  \"enterpriseImpact\": \"None.\"\n" +
                "}";

        when(aiClient.generate(any(AIRequest.class))).thenReturn(
                AIResponse.builder()
                        .content(jsonResponse)
                        .promptTokens(10)
                        .completionTokens(20)
                        .latency(150L)
                        .provider("Gemini")
                        .build()
        );

        TechnologyEvent event = aiSynthesisAgent.synthesizeAndSave(raw);

        assertNotNull(event);
        assertTrue(event.getCategoriesJson().contains("Emerging Tech"));
    }
}
