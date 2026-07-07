package com.techpulse.agent;

import com.techpulse.agent.config.ClassificationProperties;
import com.techpulse.agent.dto.*;
import com.techpulse.agent.model.CategoryType;
import com.techpulse.agent.model.SourceType;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.RawIngestionRepository;
import com.techpulse.repository.TechnologyEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test validating full end-to-end pipeline orchestrator mapping and metrics collection.
 */
public class PipelineOrchestratorTest {

    private DiscoveryAgent discoveryAgent;
    private ContentCleaningAgent contentCleaningAgent;
    private ClassificationAgent classificationAgent;
    private DuplicateDetectionAgent duplicateDetectionAgent;
    private CredibilityJudgeAgent credibilityJudgeAgent;
    private ImportanceRankingAgent importanceRankingAgent;
    private EntityExtractionAgent entityExtractionAgent;
    private EventFusionAgent eventFusionAgent;
    private RelationshipEngine relationshipEngine;
    private TimelineBuilder timelineBuilder;
    private com.techpulse.service.SummaryService summaryService;
    private com.techpulse.service.NotificationService notificationService;

    private RawIngestionRepository rawIngestionRepository;
    private TechnologyEventRepository technologyEventRepository;
    private PipelineOrchestrator pipelineOrchestrator;

    @BeforeEach
    public void setUp() {
        discoveryAgent = mock(DiscoveryAgent.class);
        contentCleaningAgent = new ContentCleaningAgent();

        ClassificationProperties props = new ClassificationProperties();
        Map<CategoryType, List<String>> keywords = new HashMap<>();
        keywords.put(CategoryType.SYSTEM_DESIGN_BACKEND, List.of("java"));
        props.setKeywords(keywords);
        classificationAgent = new ClassificationAgent(props);

        rawIngestionRepository = mock(RawIngestionRepository.class);
        duplicateDetectionAgent = new DuplicateDetectionAgent(rawIngestionRepository);
        credibilityJudgeAgent = mock(CredibilityJudgeAgent.class);
        importanceRankingAgent = mock(ImportanceRankingAgent.class);
        entityExtractionAgent = mock(EntityExtractionAgent.class);
        eventFusionAgent = mock(EventFusionAgent.class);
        relationshipEngine = mock(RelationshipEngine.class);
        timelineBuilder = mock(TimelineBuilder.class);
        summaryService = mock(com.techpulse.service.SummaryService.class);
        notificationService = mock(com.techpulse.service.NotificationService.class);
        technologyEventRepository = mock(TechnologyEventRepository.class);

        when(credibilityJudgeAgent.process(anyList())).thenAnswer(invocation -> {
            List<ValidatedUpdateDTO> valUpdates = invocation.getArgument(0);
            List<CredibilityAssessedUpdateDTO> assessed = new ArrayList<>();
            for (ValidatedUpdateDTO v : valUpdates) {
                assessed.add(CredibilityAssessedUpdateDTO.builder()
                        .validatedUpdate(v)
                        .assessment(CredibilityAssessment.builder()
                                .score(0.9)
                                .confidence(1.0)
                                .level(com.techpulse.agent.model.CredibilityLevel.VERIFIED)
                                .reasons(List.of(com.techpulse.agent.model.CredibilityReason.DEFAULT_FALLBACK))
                                .evidence(List.of("Test evidence"))
                                .build())
                        .build());
            }
            return assessed;
        });

        when(importanceRankingAgent.process(anyList())).thenAnswer(invocation -> {
            List<CredibilityAssessedUpdateDTO> credUpdates = invocation.getArgument(0);
            List<ImportanceAssessedUpdateDTO> assessed = new ArrayList<>();
            for (CredibilityAssessedUpdateDTO c : credUpdates) {
                assessed.add(ImportanceAssessedUpdateDTO.builder()
                        .credibilityAssessedUpdate(c)
                        .assessment(ImportanceAssessment.builder()
                                .score(0.85)
                                .confidence(0.9)
                                .level(com.techpulse.agent.model.ImportanceLevel.CRITICAL)
                                .reasons(List.of(com.techpulse.agent.model.ImportanceReason.DEFAULT_BASELINE))
                                .evidence(List.of("Test baseline evidence"))
                                .scoreBreakdown(Map.of("CATEGORY_WEIGHT", 0.8))
                                .metadata(new HashMap<>())
                                .build())
                        .build());
            }
            return assessed;
        });

        when(entityExtractionAgent.process(anyList())).thenAnswer(invocation -> {
            List<ImportanceAssessedUpdateDTO> impUpdates = invocation.getArgument(0);
            List<EntityExtractedUpdateDTO> resolved = new ArrayList<>();
            for (ImportanceAssessedUpdateDTO i : impUpdates) {
                resolved.add(EntityExtractedUpdateDTO.builder()
                        .importanceAssessedUpdate(i)
                        .entities(List.of(EntityExtractedUpdateDTO.ExtractedEntity.builder()
                                .name("Java")
                                .normalizedName("java")
                                .type("LANGUAGE")
                                .build()))
                        .build());
            }
            return resolved;
        });

        when(eventFusionAgent.process(anyList())).thenAnswer(invocation -> {
            List<EntityExtractedUpdateDTO> entUpdates = invocation.getArgument(0);
            List<TechnologyEventDTO> fused = new ArrayList<>();
            if (!entUpdates.isEmpty()) {
                fused.add(TechnologyEventDTO.builder()
                        .event(TechnologyEvent.builder()
                                .id("event-fused-1")
                                .title("Learn Java Programming")
                                .categoriesJson("[\"SYSTEM_DESIGN_BACKEND\"]")
                                .credibilityScore(0.9)
                                .importanceScore(0.85)
                                .mergeConfidence(1.0)
                                .firstSeen(LocalDateTime.now())
                                .lastUpdated(LocalDateTime.now())
                                .lifecycleStatus("GA")
                                .versionString("Java 21")
                                .entitiesJson("[\"Java\"]")
                                .build())
                        .supportingUpdates(entUpdates)
                        .build());
            }
            return fused;
        });

        pipelineOrchestrator = new PipelineOrchestrator(
                discoveryAgent,
                contentCleaningAgent,
                classificationAgent,
                duplicateDetectionAgent,
                credibilityJudgeAgent,
                importanceRankingAgent,
                entityExtractionAgent,
                eventFusionAgent,
                relationshipEngine,
                timelineBuilder,
                summaryService,
                notificationService,
                rawIngestionRepository,
                technologyEventRepository
        );
    }

    @Test
    public void testFullPipelineOrchestration() {
        RawUpdateDTO rawUpdate = RawUpdateDTO.builder()
                .title("Learn Java Programming")
                .rawContent("This is an HTML body about learning Java.")
                .sourceUrl("http://foo.com/java")
                .canonicalUrl("http://foo.com/java")
                .sourceType(SourceType.RSS)
                .sourceName("Mock RSS")
                .publishedAt(LocalDateTime.now())
                .fetchedAt(LocalDateTime.now())
                .build();

        PipelineContext context = new PipelineContext("orchestration-run-id", LocalDateTime.now(), new HashMap<>());
        DiscoveryResult discoveryResult = new DiscoveryResult(
                "orchestration-run-id",
                List.of(rawUpdate),
                1, 1, 0, 10L,
                new HashMap<>()
        );

        when(discoveryAgent.process(any())).thenReturn(discoveryResult);
        when(rawIngestionRepository.findRecentRawIngestions(any())).thenReturn(Collections.emptyList());

        PipelineExecutionReport report = pipelineOrchestrator.execute(context);

        assertNotNull(report);
        assertEquals("orchestration-run-id", report.runId());
        assertEquals(1, report.metrics().getUpdatesDiscovered());
        assertEquals(1, report.metrics().getUpdatesAccepted());
        assertEquals(0, report.metrics().getDuplicatesDetected());

        List<TechnologyEventDTO> updates = report.processedUpdates();
        assertEquals(1, updates.size());
        TechnologyEventDTO fused = updates.get(0);
        assertEquals("event-fused-1", fused.getEvent().getId());
        assertEquals(0.85, fused.getEvent().getImportanceScore());
    }
}
