package com.techpulse.agent;

import com.techpulse.agent.dto.*;
import com.techpulse.agent.model.*;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.TechnologyEventRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test validating EventFusionAgent version extraction and event linking.
 */
public class EventFusionAgentTest {

    @Test
    public void testEventFusionReleaseAwareness() {
        TechnologyEventRepository mockRepo = mock(TechnologyEventRepository.class);
        when(mockRepo.findAll()).thenReturn(Collections.emptyList());

        EventFusionAgent agent = new EventFusionAgent(mockRepo);

        RawUpdateDTO raw1 = RawUpdateDTO.builder()
                .title("Spring Boot v3.2.0 GA Stable Release")
                .rawContent("New features in Spring Boot version 3.2.0 GA.")
                .sourceUrl("http://foo.com/sb1")
                .canonicalUrl("http://foo.com/sb1")
                .sourceType(SourceType.RSS)
                .sourceName("Spring blog")
                .publishedAt(LocalDateTime.now())
                .fetchedAt(LocalDateTime.now())
                .build();

        CleanedUpdateDTO clean1 = CleanedUpdateDTO.builder()
                .title(raw1.getTitle())
                .cleanedContent(raw1.getRawContent())
                .sourceUrl(raw1.getSourceUrl())
                .sourceName(raw1.getSourceName())
                .publishedAt(raw1.getPublishedAt())
                .fetchedAt(raw1.getFetchedAt())
                .build();

        ClassifiedUpdateDTO class1 = ClassifiedUpdateDTO.builder()
                .cleanedUpdate(clean1)
                .categoryConfidences(Map.of(CategoryType.SYSTEM_DESIGN_BACKEND, 1.0))
                .build();

        ValidatedUpdateDTO val1 = ValidatedUpdateDTO.builder()
                .classifiedUpdate(class1)
                .eventId("event-1")
                .isDuplicate(false)
                .matchScore(0.0)
                .matchReason("NEW")
                .build();

        CredibilityAssessedUpdateDTO cred1 = CredibilityAssessedUpdateDTO.builder()
                .validatedUpdate(val1)
                .assessment(CredibilityAssessment.builder()
                        .score(0.8)
                        .confidence(0.9)
                        .level(CredibilityLevel.HIGH)
                        .reasons(List.of(CredibilityReason.DEFAULT_FALLBACK))
                        .evidence(List.of(""))
                        .build())
                .build();

        ImportanceAssessedUpdateDTO imp1 = ImportanceAssessedUpdateDTO.builder()
                .credibilityAssessedUpdate(cred1)
                .assessment(ImportanceAssessment.builder()
                        .score(0.8)
                        .confidence(0.8)
                        .level(ImportanceLevel.HIGH)
                        .reasons(List.of(ImportanceReason.DEFAULT_BASELINE))
                        .evidence(List.of(""))
                        .scoreBreakdown(new HashMap<>())
                        .metadata(new HashMap<>())
                        .build())
                .build();

        EntityExtractedUpdateDTO ext1 = EntityExtractedUpdateDTO.builder()
                .importanceAssessedUpdate(imp1)
                .entities(List.of(
                        EntityExtractedUpdateDTO.ExtractedEntity.builder()
                                .name("Spring Boot")
                                .normalizedName("springboot")
                                .type("FRAMEWORK")
                                .build()
                ))
                .build();

        List<TechnologyEventDTO> results = agent.process(List.of(ext1));

        assertEquals(1, results.size());
        TechnologyEvent event = results.get(0).getEvent();

        assertEquals("event-1", event.getId());
        assertEquals("Spring Boot v3.2.0 GA Stable Release", event.getTitle());
        assertEquals("GA", event.getLifecycleStatus());
        assertEquals(3, event.getMajorVersion());
        assertEquals(2, event.getMinorVersion());
        assertEquals(0, event.getPatchVersion());
        assertEquals("v3.2.0", event.getVersionString());
    }
}
