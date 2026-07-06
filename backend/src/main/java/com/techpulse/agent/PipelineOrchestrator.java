package com.techpulse.agent;

import com.techpulse.agent.dto.*;
import com.techpulse.model.RawIngestion;
import com.techpulse.repository.RawIngestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Orchestrates the entire Phase 4 Ingestion Pipeline with Credibility assessments.
 */
@Service
public class PipelineOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(PipelineOrchestrator.class);

    private final DiscoveryAgent discoveryAgent;
    private final ContentCleaningAgent contentCleaningAgent;
    private final ClassificationAgent classificationAgent;
    private final DuplicateDetectionAgent duplicateDetectionAgent;
    private final CredibilityJudgeAgent credibilityJudgeAgent;
    private final RawIngestionRepository rawIngestionRepository;

    public PipelineOrchestrator(DiscoveryAgent discoveryAgent,
                                ContentCleaningAgent contentCleaningAgent,
                                ClassificationAgent classificationAgent,
                                DuplicateDetectionAgent duplicateDetectionAgent,
                                CredibilityJudgeAgent credibilityJudgeAgent,
                                RawIngestionRepository rawIngestionRepository) {
        this.discoveryAgent = discoveryAgent;
        this.contentCleaningAgent = contentCleaningAgent;
        this.classificationAgent = classificationAgent;
        this.duplicateDetectionAgent = duplicateDetectionAgent;
        this.credibilityJudgeAgent = credibilityJudgeAgent;
        this.rawIngestionRepository = rawIngestionRepository;
    }

    /**
     * Executes the ingestion pipeline and returns the execution report.
     */
    public PipelineExecutionReport execute(PipelineContext context) {
        String runId = context.runId();
        LocalDateTime startLocalTime = LocalDateTime.now();
        long startTime = System.currentTimeMillis();
        long threadId = Thread.currentThread().getId();

        log.info("[PipelineOrchestrator] [runId={}] [threadId={}] Initiating full Phase 4 ingestion pipeline execution...", runId, threadId);

        Map<String, String> errors = new HashMap<>();

        // Step 1: Discovery Agent (concurrent aggregation + raw persistence)
        long t1 = System.currentTimeMillis();
        DiscoveryResult discoveryResult = discoveryAgent.process(context);
        long discoveryDuration = System.currentTimeMillis() - t1;
        errors.putAll(discoveryResult.failures());

        List<RawUpdateDTO> rawUpdates = discoveryResult.updates();
        long totalDiscovered = rawUpdates.size();

        // Step 2: Content Cleaning Agent
        long t2 = System.currentTimeMillis();
        long cleanedCount = 0;
        long rejectedCount = 0;
        List<CleanedUpdateDTO> cleanedUpdates = new ArrayList<>();
        for (RawUpdateDTO raw : rawUpdates) {
            try {
                Optional<CleanedUpdateDTO> cleanedOpt = contentCleaningAgent.process(raw);
                if (cleanedOpt.isPresent()) {
                    cleanedUpdates.add(cleanedOpt.get());
                    cleanedCount++;
                } else {
                    rejectedCount++;
                }
            } catch (Exception e) {
                log.error("[PipelineOrchestrator] [runId={}] [threadId={}] Content cleaning failed for raw update '{}': {}", 
                        runId, threadId, raw.getTitle(), e.getMessage());
                errors.put(raw.getSourceUrl(), "Cleaning error: " + e.getMessage());
                rejectedCount++;
            }
        }
        long cleaningDuration = System.currentTimeMillis() - t2;
        log.info("[ContentCleaningAgent] [runId={}] [threadId={}] processed={} accepted={} rejected={} elapsed={}ms [warnings=0 errors={}]",
                runId, threadId, totalDiscovered, cleanedCount, rejectedCount, cleaningDuration, errors.size());

        // Step 3: Classification Agent
        long t3 = System.currentTimeMillis();
        long classifiedCount = 0;
        List<ClassifiedUpdateDTO> classifiedUpdates = new ArrayList<>();
        for (CleanedUpdateDTO cleaned : cleanedUpdates) {
            try {
                ClassifiedUpdateDTO classified = classificationAgent.process(cleaned);
                classifiedUpdates.add(classified);
                classifiedCount++;
            } catch (Exception e) {
                log.error("[PipelineOrchestrator] [runId={}] [threadId={}] Classification failed for cleaned update '{}': {}", 
                        runId, threadId, cleaned.getTitle(), e.getMessage());
                errors.put(cleaned.getSourceUrl(), "Classification error: " + e.getMessage());
            }
        }
        long classificationDuration = System.currentTimeMillis() - t3;
        log.info("[ClassificationAgent] [runId={}] [threadId={}] processed={} accepted={} rejected={} elapsed={}ms [warnings=0 errors={}]",
                runId, threadId, cleanedCount, classifiedCount, (cleanedCount - classifiedCount), classificationDuration, errors.size());

        // Step 4: Duplicate Detection Agent
        long t4 = System.currentTimeMillis();
        long duplicateCount = 0;
        List<ValidatedUpdateDTO> validatedUpdates = new ArrayList<>();
        try {
            validatedUpdates = duplicateDetectionAgent.process(classifiedUpdates);
            duplicateCount = validatedUpdates.stream().filter(ValidatedUpdateDTO::isDuplicate).count();
        } catch (Exception e) {
            log.error("[PipelineOrchestrator] [runId={}] [threadId={}] Duplicate detection failed: {}", runId, threadId, e.getMessage(), e);
            errors.put("duplicate-detection", e.getMessage());
        }
        long duplicateDetectionDuration = System.currentTimeMillis() - t4;
        log.info("[DuplicateDetectionAgent] [runId={}] [threadId={}] processed={} accepted={} rejected=0 elapsed={}ms [warnings=0 errors={}]",
                runId, threadId, classifiedCount, (classifiedCount - duplicateCount), duplicateDetectionDuration, errors.size());

        // Step 5: Credibility Judge Agent
        long t5 = System.currentTimeMillis();
        List<CredibilityAssessedUpdateDTO> assessedUpdates = new ArrayList<>();
        try {
            assessedUpdates = credibilityJudgeAgent.process(validatedUpdates);
        } catch (Exception e) {
            log.error("[PipelineOrchestrator] [runId={}] [threadId={}] Credibility assessment failed: {}", runId, threadId, e.getMessage(), e);
            errors.put("credibility-assessment", e.getMessage());
        }
        long credibilityDuration = System.currentTimeMillis() - t5;

        // Step 6: Update Raw Ingestion status, event IDs, and credibility details in DB
        updateRawIngestions(runId, assessedUpdates);

        long totalDurationMs = System.currentTimeMillis() - startTime;
        LocalDateTime endLocalTime = LocalDateTime.now();

        // Calculate slowest/fastest stages
        Map<String, Long> stages = new HashMap<>();
        stages.put("DiscoveryAgent", discoveryDuration);
        stages.put("ContentCleaningAgent", cleaningDuration);
        stages.put("ClassificationAgent", classificationDuration);
        stages.put("DuplicateDetectionAgent", duplicateDetectionDuration);
        stages.put("CredibilityJudgeAgent", credibilityDuration);

        String slowestAgent = "None";
        long slowestTime = -1;
        String fastestAgent = "None";
        long fastestTime = Long.MAX_VALUE;

        for (Map.Entry<String, Long> entry : stages.entrySet()) {
            if (entry.getValue() > slowestTime) {
                slowestTime = entry.getValue();
                slowestAgent = entry.getKey();
            }
            if (entry.getValue() < fastestTime) {
                fastestTime = entry.getValue();
                fastestAgent = entry.getKey();
            }
        }

        double processingRate = totalDurationMs > 0 ? (totalDiscovered * 1000.0) / totalDurationMs : 0.0;
        long newEventsCreated = validatedUpdates.stream().filter(v -> !v.isDuplicate()).count();

        PipelineMetrics metrics = PipelineMetrics.builder()
                .runId(runId)
                .startTime(startLocalTime)
                .endTime(endLocalTime)
                .totalDurationMs(totalDurationMs)
                .discoveryDurationMs(discoveryDuration)
                .cleaningDurationMs(cleaningDuration)
                .classificationDurationMs(classificationDuration)
                .duplicateDetectionDurationMs(duplicateDetectionDuration)
                .sourcesProcessed(discoveryResult.totalSources())
                .successfulSources(discoveryResult.successCount())
                .failedSources(discoveryResult.failureCount())
                .updatesDiscovered(totalDiscovered)
                .updatesAccepted(cleanedCount)
                .updatesRejected(rejectedCount)
                .duplicatesDetected(duplicateCount)
                .newEventsCreated(newEventsCreated)
                .processingRate(Math.round(processingRate * 100.0) / 100.0)
                .slowestAgentName(slowestAgent)
                .slowestAgentDurationMs(slowestTime)
                .fastestAgentName(fastestAgent)
                .fastestAgentDurationMs(fastestTime)
                .build();

        log.info("[PipelineOrchestrator] [runId={}] [threadId={}] Pipeline execution complete in {}ms. Discovered: {}, Cleaned: {}, Classified: {}, Duplicates: {}, Processing Rate: {}/s",
                runId, threadId, totalDurationMs, totalDiscovered, cleanedCount, classifiedCount, duplicateCount, metrics.getProcessingRate());

        return new PipelineExecutionReport(
                runId,
                metrics,
                assessedUpdates,
                errors
        );
    }

    private void updateRawIngestions(String runId, List<CredibilityAssessedUpdateDTO> assessedUpdates) {
        log.info("[PipelineOrchestrator] [runId={}] Updating database raw updates processing status & credibility metrics...", runId);
        try {
            List<RawIngestion> dbRecords = rawIngestionRepository.findAll().stream()
                    .filter(r -> r.getRunId().equals(runId))
                    .toList();

            for (CredibilityAssessedUpdateDTO val : assessedUpdates) {
                ValidatedUpdateDTO validated = val.getValidatedUpdate();
                CleanedUpdateDTO cleaned = validated.getClassifiedUpdate().getCleanedUpdate();
                CredibilityAssessment assess = val.getAssessment();

                dbRecords.stream()
                        .filter(r -> r.getUrl().equalsIgnoreCase(cleaned.getSourceUrl()))
                        .findFirst()
                        .ifPresent(record -> {
                            record.setEventId(validated.getEventId());
                            record.setProcessingStatus(validated.isDuplicate()
                                    ? RawIngestion.ProcessingStatus.DUPLICATE
                                    : RawIngestion.ProcessingStatus.CLASSIFIED);
                            record.setCredibilityScore(assess.getScore());
                            record.setCredibilityLevel(assess.getLevel().name());
                            record.setCredibilityConfidence(assess.getConfidence());
                            record.setScoreBaseline(assess.getBaselineWeight());
                            record.setScoreOfficialBonus(assess.getOfficialBonus());
                            record.setScoreAgreementBonus(assess.getAgreementBonus());
                            record.setScoreClickbaitPenalty(assess.getClickbaitPenalty());
                            record.setIsOfficial(assess.isOfficial());
                            rawIngestionRepository.save(record);
                        });
            }
            log.info("[PipelineOrchestrator] [runId={}] Database statuses and scores successfully updated.", runId);
        } catch (Exception e) {
            log.error("[PipelineOrchestrator] [runId={}] Failed to update raw ingestion processing statuses: {}", runId, e.getMessage(), e);
        }
    }
}
