package com.techpulse.agent;

import com.techpulse.agent.dto.*;
import com.techpulse.agent.model.*;
import com.techpulse.model.KgEdge;
import com.techpulse.model.KgNode;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.KgEdgeRepository;
import com.techpulse.repository.KgNodeRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test validating RelationshipEngine alias resolution and incremental edge confidence.
 */
public class RelationshipEngineTest {

    @Test
    public void testRelationshipConstructionAndConfidenceIncremental() {
        KgNodeRepository nodeRepo = mock(KgNodeRepository.class);
        KgEdgeRepository edgeRepo = mock(KgEdgeRepository.class);

        when(nodeRepo.findByNormalizedName("springboot")).thenReturn(Optional.of(
                KgNode.builder().id("node-1").name("Spring Boot").normalizedName("springboot").type("FRAMEWORK").mentionCount(5).build()
        ));
        when(nodeRepo.findByNormalizedName("java")).thenReturn(Optional.of(
                KgNode.builder().id("node-2").name("Java").normalizedName("java").type("LANGUAGE").mentionCount(10).build()
        ));

        when(nodeRepo.save(any(KgNode.class))).thenAnswer(i -> i.getArgument(0));

        when(edgeRepo.findBySourceNodeIdAndTargetNodeIdAndRelationType("node-1", "node-2", "WRITTEN_IN"))
                .thenReturn(Optional.of(
                        KgEdge.builder()
                                .id("edge-123")
                                .sourceNodeId("node-1")
                                .targetNodeId("node-2")
                                .relationType("WRITTEN_IN")
                                .weight(2.0)
                                .confidence(0.60)
                                .evidenceCount(2)
                                .supportingUrls("[\"http://old.url\"]")
                                .build()
                ));
        when(edgeRepo.save(any(KgEdge.class))).thenAnswer(i -> i.getArgument(0));

        RelationshipEngine engine = new RelationshipEngine(nodeRepo, edgeRepo);

        RawUpdateDTO raw = RawUpdateDTO.builder()
                .title("Spring Boot GA is written in Java 21")
                .rawContent("")
                .sourceUrl("http://new.url")
                .publishedAt(LocalDateTime.now())
                .fetchedAt(LocalDateTime.now())
                .build();
        CleanedUpdateDTO clean = CleanedUpdateDTO.builder()
                .title(raw.getTitle())
                .cleanedContent(raw.getRawContent())
                .sourceUrl(raw.getSourceUrl())
                .publishedAt(raw.getPublishedAt())
                .fetchedAt(raw.getFetchedAt())
                .build();
        ClassifiedUpdateDTO classif = ClassifiedUpdateDTO.builder().cleanedUpdate(clean).build();
        ValidatedUpdateDTO val = ValidatedUpdateDTO.builder().classifiedUpdate(classif).eventId("ev-1").build();
        CredibilityAssessedUpdateDTO cred = CredibilityAssessedUpdateDTO.builder()
                .validatedUpdate(val)
                .assessment(CredibilityAssessment.builder()
                        .score(0.9)
                        .confidence(1.0)
                        .level(CredibilityLevel.VERIFIED)
                        .reasons(List.of())
                        .evidence(List.of())
                        .build())
                .build();
        ImportanceAssessedUpdateDTO imp = ImportanceAssessedUpdateDTO.builder()
                .credibilityAssessedUpdate(cred)
                .assessment(ImportanceAssessment.builder()
                        .score(0.8)
                        .confidence(0.8)
                        .level(ImportanceLevel.HIGH)
                        .reasons(List.of())
                        .evidence(List.of())
                        .scoreBreakdown(new HashMap<>())
                        .metadata(new HashMap<>())
                        .build())
                .build();

        EntityExtractedUpdateDTO ext = EntityExtractedUpdateDTO.builder()
                .importanceAssessedUpdate(imp)
                .entities(List.of(
                        EntityExtractedUpdateDTO.ExtractedEntity.builder().name("Spring Boot").normalizedName("springboot").type("FRAMEWORK").build(),
                        EntityExtractedUpdateDTO.ExtractedEntity.builder().name("Java").normalizedName("java").type("LANGUAGE").build()
                ))
                .build();

        TechnologyEventDTO eventDto = TechnologyEventDTO.builder()
                .event(TechnologyEvent.builder().id("ev-1").title("Spring Boot written in Java").build())
                .supportingUpdates(List.of(ext))
                .build();

        engine.buildRelationships(eventDto);

        verify(edgeRepo, times(1)).save(argThat(edge -> {
            assertEquals("node-1", edge.getSourceNodeId());
            assertEquals("node-2", edge.getTargetNodeId());
            assertEquals("WRITTEN_IN", edge.getRelationType());
            assertEquals(0.70, edge.getConfidence(), 0.01);
            assertEquals(3, edge.getEvidenceCount());
            return true;
        }));
    }
}
