package com.techpulse.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.techpulse.agent.*;
import com.techpulse.agent.dto.*;
import com.techpulse.agent.model.SourceType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;

/**
 * Service orchestrating load benchmarks and concurrent stress-tests on the pipeline.
 */
@Service
public class BenchmarkService {

    private static final Logger log = LoggerFactory.getLogger(BenchmarkService.class);

    private final ContentCleaningAgent contentCleaningAgent;
    private final ClassificationAgent classificationAgent;
    private final DuplicateDetectionAgent duplicateDetectionAgent;
    private final CredibilityJudgeAgent credibilityJudgeAgent;
    private final ImportanceRankingAgent importanceRankingAgent;
    private final EntityExtractionAgent entityExtractionAgent;
    private final EventFusionAgent eventFusionAgent;
    private final PipelineOrchestrator pipelineOrchestrator;
    private final ObjectMapper objectMapper;

    public BenchmarkService(ContentCleaningAgent contentCleaningAgent,
                            ClassificationAgent classificationAgent,
                            DuplicateDetectionAgent duplicateDetectionAgent,
                            CredibilityJudgeAgent credibilityJudgeAgent,
                            ImportanceRankingAgent importanceRankingAgent,
                            EntityExtractionAgent entityExtractionAgent,
                            EventFusionAgent eventFusionAgent,
                            PipelineOrchestrator pipelineOrchestrator) {
        this.contentCleaningAgent = contentCleaningAgent;
        this.classificationAgent = classificationAgent;
        this.duplicateDetectionAgent = duplicateDetectionAgent;
        this.credibilityJudgeAgent = credibilityJudgeAgent;
        this.importanceRankingAgent = importanceRankingAgent;
        this.entityExtractionAgent = entityExtractionAgent;
        this.eventFusionAgent = eventFusionAgent;
        this.pipelineOrchestrator = pipelineOrchestrator;
        this.objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    }

    /**
     * Runs configurable benchmarks (synthetic vs. real sources) and exports CSV and JSON reports.
     */
    public Map<String, Object> runBenchmark(String mode, int datasetSize, int concurrency) {
        log.info("[BenchmarkService] Initiating benchmark. Mode: {}, Size: {}, Concurrency: {}", mode, datasetSize, concurrency);
        
        long startTime = System.currentTimeMillis();
        Map<String, Object> results = new LinkedHashMap<>();
        results.put("timestamp", LocalDateTime.now().toString());
        results.put("mode", mode);
        results.put("datasetSize", datasetSize);
        results.put("concurrency", concurrency);

        if ("SYNTHETIC".equalsIgnoreCase(mode)) {
            runSyntheticBenchmark(datasetSize, concurrency, results);
        } else {
            runRealBenchmark(concurrency, results);
        }

        long totalElapsed = System.currentTimeMillis() - startTime;
        results.put("totalBenchmarkTimeMs", totalElapsed);

        exportReports(results);
        return results;
    }

    private void runSyntheticBenchmark(int size, int concurrency, Map<String, Object> results) {
        log.info("[BenchmarkService] Generating {} synthetic updates...", size);
        List<RawUpdateDTO> mockUpdates = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            mockUpdates.add(RawUpdateDTO.builder()
                    .title("<p>Mock Article " + i + " on Java and AI</p>")
                    .rawContent("This is some raw content detailing JDK releases and LLM advancements. Word count padding here.")
                    .sourceUrl("http://mocksource.com/article/" + i)
                    .canonicalUrl("http://mocksource.com/article/" + i)
                    .sourceType(SourceType.RSS)
                    .sourceName("Synthetic Feed")
                    .publishedAt(LocalDateTime.now())
                    .fetchedAt(LocalDateTime.now())
                    .build());
        }

        log.info("[BenchmarkService] Processing synthetic updates (concurrency={})...", concurrency);
        
        long t1 = System.currentTimeMillis();
        List<CleanedUpdateDTO> cleaned = new ArrayList<>();
        for (RawUpdateDTO raw : mockUpdates) {
            contentCleaningAgent.process(raw).ifPresent(cleaned::add);
        }
        long cleaningTime = System.currentTimeMillis() - t1;

        long t2 = System.currentTimeMillis();
        List<ClassifiedUpdateDTO> classified = new ArrayList<>();
        for (CleanedUpdateDTO clean : cleaned) {
            classified.add(classificationAgent.process(clean));
        }
        long classificationTime = System.currentTimeMillis() - t2;

        long t3 = System.currentTimeMillis();
        List<ValidatedUpdateDTO> validated = duplicateDetectionAgent.process(classified);
        long duplicateTime = System.currentTimeMillis() - t3;

        long t4 = System.currentTimeMillis();
        List<CredibilityAssessedUpdateDTO> credibilityAssessed = credibilityJudgeAgent.process(validated);
        long credibilityTime = System.currentTimeMillis() - t4;

        long t5 = System.currentTimeMillis();
        List<ImportanceAssessedUpdateDTO> importanceAssessed = importanceRankingAgent.process(credibilityAssessed);
        long importanceTime = System.currentTimeMillis() - t5;

        long t6 = System.currentTimeMillis();
        List<EntityExtractedUpdateDTO> entityExtracted = entityExtractionAgent.process(importanceAssessed);
        long entityExtractionTime = System.currentTimeMillis() - t6;

        long t7 = System.currentTimeMillis();
        List<TechnologyEventDTO> fusedEvents = eventFusionAgent.process(entityExtracted);
        long eventFusionTime = System.currentTimeMillis() - t7;

        long processingTime = cleaningTime + classificationTime + duplicateTime + credibilityTime + importanceTime + entityExtractionTime + eventFusionTime;
        double rate = processingTime > 0 ? (size * 1000.0) / processingTime : 0.0;

        results.put("cleaningTimeMs", cleaningTime);
        results.put("classificationTimeMs", classificationTime);
        results.put("duplicateDetectionTimeMs", duplicateTime);
        results.put("credibilityJudgeTimeMs", credibilityTime);
        results.put("importanceRankingTimeMs", importanceTime);
        results.put("entityExtractionTimeMs", entityExtractionTime);
        results.put("eventFusionTimeMs", eventFusionTime);
        results.put("totalProcessingTimeMs", processingTime);
        results.put("processingRatePerSec", Math.round(rate * 100.0) / 100.0);
        results.put("processedCount", size);
        results.put("cleanedCount", cleaned.size());
        results.put("duplicatesDetected", validated.stream().filter(ValidatedUpdateDTO::isDuplicate).count());
    }

    private void runRealBenchmark(int concurrency, Map<String, Object> results) {
        log.info("[BenchmarkService] Executing real RSS sources benchmark with concurrency {}...", concurrency);
        
        ExecutorService executor = Executors.newFixedThreadPool(concurrency);
        List<Future<PipelineExecutionReport>> futures = new ArrayList<>();

        long t1 = System.currentTimeMillis();
        for (int i = 0; i < concurrency; i++) {
            final String runId = "benchmark-real-" + UUID.randomUUID().toString().substring(0, 8);
            futures.add(executor.submit(() -> {
                PipelineContext context = new PipelineContext(runId, LocalDateTime.now(), new HashMap<>());
                return pipelineOrchestrator.execute(context);
            }));
        }

        long totalDiscovered = 0;
        long totalCleaned = 0;
        long totalDuplicates = 0;

        for (Future<PipelineExecutionReport> future : futures) {
            try {
                PipelineExecutionReport report = future.get();
                totalDiscovered += report.metrics().getUpdatesDiscovered();
                totalCleaned += report.metrics().getUpdatesAccepted();
                totalDuplicates += report.metrics().getDuplicatesDetected();
            } catch (Exception e) {
                log.error("[BenchmarkService] Real run execution error: {}", e.getMessage());
            }
        }
        executor.shutdown();
        long elapsed = System.currentTimeMillis() - t1;

        double rate = elapsed > 0 ? (totalDiscovered * 1000.0) / elapsed : 0.0;

        results.put("totalIngestionTimeMs", elapsed);
        results.put("totalDiscoveredCount", totalDiscovered);
        results.put("totalCleanedCount", totalCleaned);
        results.put("totalDuplicatesCount", totalDuplicates);
        results.put("processingRatePerSec", Math.round(rate * 100.0) / 100.0);
    }

    private void exportReports(Map<String, Object> results) {
        try {
            File dir = new File("target/benchmarks");
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            
            File jsonFile = new File(dir, "report_" + timestamp + ".json");
            objectMapper.writeValue(jsonFile, results);
            log.info("[BenchmarkService] Exported JSON benchmark report to: {}", jsonFile.getAbsolutePath());

            File csvFile = new File(dir, "report_" + timestamp + ".csv");
            try (FileWriter writer = new FileWriter(csvFile)) {
                StringBuilder header = new StringBuilder();
                StringBuilder values = new StringBuilder();

                for (Map.Entry<String, Object> entry : results.entrySet()) {
                    header.append(entry.getKey()).append(",");
                    values.append(String.valueOf(entry.getValue()).replace(",", ";")).append(",");
                }

                writer.write(header.substring(0, header.length() - 1) + "\n");
                writer.write(values.substring(0, values.length() - 1) + "\n");
            }
            log.info("[BenchmarkService] Exported CSV benchmark report to: {}", csvFile.getAbsolutePath());

        } catch (Exception e) {
            log.error("[BenchmarkService] Failed to export benchmark reports: {}", e.getMessage(), e);
        }
    }
}
