package com.techpulse.agent;

import com.techpulse.agent.dto.*;
import com.techpulse.agent.model.*;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test validating EntityExtractionAgent entity detection and normalization.
 */
public class EntityExtractionAgentTest {

    @Test
    public void testEntityExtractionAndNormalization() {
        EntityExtractionAgent agent = new EntityExtractionAgent();

        RawUpdateDTO raw = RawUpdateDTO.builder()
                .title("New GA release of Spring Boot with CVE-2026-1234 security vulnerability fixes.")
                .rawContent("This GA update integrates Java and Kubernetes. We also deploy on AWS.")
                .sourceUrl("http://foo.com/sb")
                .canonicalUrl("http://foo.com/sb")
                .sourceType(SourceType.RSS)
                .sourceName("Spring blog")
                .publishedAt(LocalDateTime.now())
                .fetchedAt(LocalDateTime.now())
                .build();

        CleanedUpdateDTO cleaned = CleanedUpdateDTO.builder()
                .title(raw.getTitle())
                .cleanedContent(raw.getRawContent())
                .sourceUrl(raw.getSourceUrl())
                .sourceName(raw.getSourceName())
                .publishedAt(raw.getPublishedAt())
                .fetchedAt(raw.getFetchedAt())
                .build();

        ClassifiedUpdateDTO classified = ClassifiedUpdateDTO.builder()
                .cleanedUpdate(cleaned)
                .categoryConfidences(Map.of(CategoryType.SYSTEM_DESIGN_BACKEND, 1.0))
                .build();

        ValidatedUpdateDTO validated = ValidatedUpdateDTO.builder()
                .classifiedUpdate(classified)
                .eventId("event-123")
                .isDuplicate(false)
                .matchScore(0.0)
                .matchReason("NEW")
                .build();

        CredibilityAssessedUpdateDTO cred = CredibilityAssessedUpdateDTO.builder()
                .validatedUpdate(validated)
                .assessment(CredibilityAssessment.builder()
                        .score(0.8)
                        .confidence(0.9)
                        .level(CredibilityLevel.HIGH)
                        .reasons(List.of(CredibilityReason.DEFAULT_FALLBACK))
                        .evidence(List.of("Test"))
                        .build())
                .build();

        ImportanceAssessedUpdateDTO imp = ImportanceAssessedUpdateDTO.builder()
                .credibilityAssessedUpdate(cred)
                .assessment(ImportanceAssessment.builder()
                        .score(0.8)
                        .confidence(0.8)
                        .level(ImportanceLevel.HIGH)
                        .reasons(List.of(ImportanceReason.DEFAULT_BASELINE))
                        .evidence(List.of("Test"))
                        .scoreBreakdown(new HashMap<>())
                        .metadata(new HashMap<>())
                        .build())
                .build();

        List<EntityExtractedUpdateDTO> results = agent.process(List.of(imp));

        assertEquals(1, results.size());
        EntityExtractedUpdateDTO res = results.get(0);

        List<EntityExtractedUpdateDTO.ExtractedEntity> entities = res.getEntities();
        assertFalse(entities.isEmpty());

        assertTrue(entities.stream().anyMatch(e -> e.getName().equals("Spring Boot") && e.getType().equals("FRAMEWORK")));
        assertTrue(entities.stream().anyMatch(e -> e.getName().equals("Java") && e.getType().equals("LANGUAGE")));
        assertTrue(entities.stream().anyMatch(e -> e.getName().equals("Kubernetes") && e.getType().equals("FRAMEWORK")));
        assertTrue(entities.stream().anyMatch(e -> e.getName().equals("AWS") && e.getType().equals("CLOUD_PROVIDER")));
        assertTrue(entities.stream().anyMatch(e -> e.getName().equals("CVE-2026-1234") && e.getType().equals("SECURITY_VULNERABILITY")));
    }
}
