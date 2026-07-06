package com.techpulse.service;

import com.techpulse.agent.*;
import com.techpulse.agent.dto.*;
import com.techpulse.agent.model.CategoryType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test verifying programmatic pipeline stress and synthetic benchmarking runs.
 */
public class BenchmarkServiceTest {

    private ContentCleaningAgent contentCleaningAgent;
    private ClassificationAgent classificationAgent;
    private DuplicateDetectionAgent duplicateDetectionAgent;
    private PipelineOrchestrator pipelineOrchestrator;
    private BenchmarkService benchmarkService;

    @BeforeEach
    public void setUp() {
        contentCleaningAgent = new ContentCleaningAgent();
        classificationAgent = mock(ClassificationAgent.class);
        
        when(classificationAgent.process(any())).thenAnswer(invocation -> {
            CleanedUpdateDTO input = invocation.getArgument(0);
            return ClassifiedUpdateDTO.builder()
                    .cleanedUpdate(input)
                    .categoryConfidences(Map.of(CategoryType.SYSTEM_DESIGN_BACKEND, 1.0))
                    .build();
        });

        duplicateDetectionAgent = mock(DuplicateDetectionAgent.class);
        when(duplicateDetectionAgent.process(anyList())).thenAnswer(invocation -> {
            List<ClassifiedUpdateDTO> input = invocation.getArgument(0);
            List<ValidatedUpdateDTO> validated = new ArrayList<>();
            for (ClassifiedUpdateDTO c : input) {
                validated.add(ValidatedUpdateDTO.builder()
                        .classifiedUpdate(c)
                        .eventId(UUID.randomUUID().toString())
                        .isDuplicate(false)
                        .matchScore(0.0)
                        .matchReason("NEW")
                        .build());
            }
            return validated;
        });

        CredibilityJudgeAgent credibilityJudgeAgent = mock(CredibilityJudgeAgent.class);
        when(credibilityJudgeAgent.process(anyList())).thenAnswer(invocation -> {
            List<ValidatedUpdateDTO> valUpdates = invocation.getArgument(0);
            List<CredibilityAssessedUpdateDTO> assessed = new ArrayList<>();
            for (ValidatedUpdateDTO v : valUpdates) {
                assessed.add(CredibilityAssessedUpdateDTO.builder()
                        .validatedUpdate(v)
                        .assessment(CredibilityAssessment.builder()
                                .score(0.8)
                                .confidence(0.9)
                                .level(com.techpulse.agent.model.CredibilityLevel.HIGH)
                                .reasons(List.of(com.techpulse.agent.model.CredibilityReason.DEFAULT_FALLBACK))
                                .evidence(List.of("Benchmark mock assessment"))
                                .build())
                        .build());
            }
            return assessed;
        });

        pipelineOrchestrator = mock(PipelineOrchestrator.class);

        benchmarkService = new BenchmarkService(
                contentCleaningAgent,
                classificationAgent,
                duplicateDetectionAgent,
                credibilityJudgeAgent,
                pipelineOrchestrator
        );
    }

    @Test
    public void testSyntheticBenchmark() {
        Map<String, Object> results = benchmarkService.runBenchmark("SYNTHETIC", 10, 1);

        assertNotNull(results);
        assertEquals("SYNTHETIC", results.get("mode"));
        assertEquals(10, results.get("datasetSize"));
        assertTrue(results.containsKey("processingRatePerSec"));
        assertTrue(results.containsKey("totalProcessingTimeMs"));
    }
}
