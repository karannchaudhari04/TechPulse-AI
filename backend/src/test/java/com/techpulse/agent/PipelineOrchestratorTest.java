package com.techpulse.agent;

import com.techpulse.agent.config.ClassificationProperties;
import com.techpulse.agent.dto.*;
import com.techpulse.agent.model.CategoryType;
import com.techpulse.agent.model.SourceType;
import com.techpulse.repository.RawIngestionRepository;
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
    private RawIngestionRepository rawIngestionRepository;
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

        pipelineOrchestrator = new PipelineOrchestrator(
                discoveryAgent,
                contentCleaningAgent,
                classificationAgent,
                duplicateDetectionAgent,
                credibilityJudgeAgent,
                rawIngestionRepository
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

        List<CredibilityAssessedUpdateDTO> updates = report.processedUpdates();
        assertEquals(1, updates.size());
        CredibilityAssessedUpdateDTO assessed = updates.get(0);
        assertFalse(assessed.getValidatedUpdate().isDuplicate());
        assertTrue(assessed.getValidatedUpdate().getClassifiedUpdate().getCategoryConfidences().containsKey(CategoryType.SYSTEM_DESIGN_BACKEND));
        assertEquals(0.9, assessed.getAssessment().getScore());
    }
}
