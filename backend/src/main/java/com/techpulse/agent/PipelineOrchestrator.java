package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.dto.*;
import com.techpulse.model.RawIngestion;
import com.techpulse.repository.RawIngestionRepository;
import com.techpulse.repository.TechnologyEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Orchestrates the full TechPulse AI ingestion and synthesis pipeline.
 */
@Service
public class PipelineOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(PipelineOrchestrator.class);

    private final DiscoveryAgent discoveryAgent;
    private final ContentCleaningAgent contentCleaningAgent;
    private final ClassificationAgent classificationAgent;
    private final DuplicateDetectionAgent duplicateDetectionAgent;
    private final CredibilityJudgeAgent credibilityJudgeAgent;
    private final ImportanceRankingAgent importanceRankingAgent;
    private final EntityExtractionAgent entityExtractionAgent;
    private final EventFusionAgent eventFusionAgent;
    private final RelationshipEngine relationshipEngine;
    private final TimelineBuilder timelineBuilder;
    private final com.techpulse.service.SummaryService summaryService;
    private final com.techpulse.service.NotificationService notificationService;
    
    private final RawIngestionRepository rawIngestionRepository;
    private final TechnologyEventRepository technologyEventRepository;
    private final ObjectMapper objectMapper;

    public PipelineOrchestrator(DiscoveryAgent discoveryAgent,
                                ContentCleaningAgent contentCleaningAgent,
                                ClassificationAgent classificationAgent,
                                DuplicateDetectionAgent duplicateDetectionAgent,
                                CredibilityJudgeAgent credibilityJudgeAgent,
                                ImportanceRankingAgent importanceRankingAgent,
                                EntityExtractionAgent entityExtractionAgent,
                                EventFusionAgent eventFusionAgent,
                                RelationshipEngine relationshipEngine,
                                TimelineBuilder timelineBuilder,
                                com.techpulse.service.SummaryService summaryService,
                                com.techpulse.service.NotificationService notificationService,
                                RawIngestionRepository rawIngestionRepository,
                                TechnologyEventRepository technologyEventRepository) {
        this.discoveryAgent = discoveryAgent;
        this.contentCleaningAgent = contentCleaningAgent;
        this.classificationAgent = classificationAgent;
        this.duplicateDetectionAgent = duplicateDetectionAgent;
        this.credibilityJudgeAgent = credibilityJudgeAgent;
        this.importanceRankingAgent = importanceRankingAgent;
        this.entityExtractionAgent = entityExtractionAgent;
        this.eventFusionAgent = eventFusionAgent;
        this.relationshipEngine = relationshipEngine;
        this.timelineBuilder = timelineBuilder;
        this.summaryService = summaryService;
        this.notificationService = notificationService;
        this.rawIngestionRepository = rawIngestionRepository;
        this.technologyEventRepository = technologyEventRepository;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Executes the ingestion pipeline and returns the execution report.
     */
    public PipelineExecutionReport execute(PipelineContext context) {
        String runId = context.runId();
        LocalDateTime startLocalTime = LocalDateTime.now();
        long startTime = System.currentTimeMillis();
        long threadId = Thread.currentThread().getId();

        log.info("[PipelineOrchestrator] [runId={}] [threadId={}] Initiating full ingestion pipeline execution...", runId, threadId);

        Map<String, String> errors = new HashMap<>();

        // Step 1: Discovery Agent
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
                log.error("[PipelineOrchestrator] Content cleaning failed for raw update '{}': {}", raw.getTitle(), e.getMessage());
                errors.put(raw.getSourceUrl(), "Cleaning error: " + e.getMessage());
                rejectedCount++;
            }
        }
        long cleaningDuration = System.currentTimeMillis() - t2;

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
                log.error("[PipelineOrchestrator] Classification failed for cleaned update '{}': {}", cleaned.getTitle(), e.getMessage());
                errors.put(cleaned.getSourceUrl(), "Classification error: " + e.getMessage());
            }
        }
        long classificationDuration = System.currentTimeMillis() - t3;

        // Step 4: Duplicate Detection Agent
        long t4 = System.currentTimeMillis();
        long duplicateCount = 0;
        List<ValidatedUpdateDTO> validatedUpdates = new ArrayList<>();
        try {
            validatedUpdates = duplicateDetectionAgent.process(classifiedUpdates);
            duplicateCount = validatedUpdates.stream().filter(ValidatedUpdateDTO::isDuplicate).count();
        } catch (Exception e) {
            log.error("[PipelineOrchestrator] Duplicate detection failed: {}", e.getMessage(), e);
            errors.put("duplicate-detection", e.getMessage());
        }
        long duplicateDetectionDuration = System.currentTimeMillis() - t4;

        // Step 5: Credibility Judge Agent
        long t5 = System.currentTimeMillis();
        List<CredibilityAssessedUpdateDTO> credibilityAssessedUpdates = new ArrayList<>();
        try {
            credibilityAssessedUpdates = credibilityJudgeAgent.process(validatedUpdates);
        } catch (Exception e) {
            log.error("[PipelineOrchestrator] Credibility assessment failed: {}", e.getMessage(), e);
            errors.put("credibility-assessment", e.getMessage());
        }
        long credibilityDuration = System.currentTimeMillis() - t5;

        // Step 6: Importance Ranking Agent
        long t6 = System.currentTimeMillis();
        List<ImportanceAssessedUpdateDTO> importanceAssessedUpdates = new ArrayList<>();
        try {
            importanceAssessedUpdates = importanceRankingAgent.process(credibilityAssessedUpdates);
        } catch (Exception e) {
            log.error("[PipelineOrchestrator] Importance ranking failed: {}", e.getMessage(), e);
            errors.put("importance-ranking", e.getMessage());
        }
        long importanceDuration = System.currentTimeMillis() - t6;

        // Step 7: Entity Extraction Agent
        long t7 = System.currentTimeMillis();
        List<EntityExtractedUpdateDTO> entityExtractedUpdates = new ArrayList<>();
        try {
            entityExtractedUpdates = entityExtractionAgent.process(importanceAssessedUpdates);
        } catch (Exception e) {
            log.error("[PipelineOrchestrator] Entity extraction failed: {}", e.getMessage(), e);
            errors.put("entity-extraction", e.getMessage());
        }
        long entityExtractionDuration = System.currentTimeMillis() - t7;

        // Step 8: Event Fusion Agent
        long t8 = System.currentTimeMillis();
        List<TechnologyEventDTO> fusedEvents = new ArrayList<>();
        try {
            fusedEvents = eventFusionAgent.process(entityExtractedUpdates);
        } catch (Exception e) {
            log.error("[PipelineOrchestrator] Event fusion failed: {}", e.getMessage(), e);
            errors.put("event-fusion", e.getMessage());
        }
        long eventFusionDuration = System.currentTimeMillis() - t8;

        // Step 9: Relationship Engine & Timeline Builder (Graph Construction)
        long t9 = System.currentTimeMillis();
        try {
            for (TechnologyEventDTO eventDto : fusedEvents) {
                technologyEventRepository.save(eventDto.getEvent());
                relationshipEngine.buildRelationships(eventDto);
                timelineBuilder.recordTimeline(eventDto);
            }
        } catch (Exception e) {
            log.error("[PipelineOrchestrator] Graph construction failed: {}", e.getMessage(), e);
            errors.put("graph-persistence", e.getMessage());
        }
        long graphDuration = System.currentTimeMillis() - t9;

        // Step 10: AI Synthesis Agent (Failures Isolated)
        long t10 = System.currentTimeMillis();
        for (TechnologyEventDTO eventDto : fusedEvents) {
            try {
                summaryService.process(eventDto);
                notificationService.processEventNotifications(eventDto.getEvent());
            } catch (Exception e) {
                log.error("[PipelineOrchestrator] AI Synthesis failed for event ID '{}': {}", 
                        eventDto.getEvent().getId(), e.getMessage());
                errors.put("ai-synthesis-" + eventDto.getEvent().getId(), e.getMessage());
            }
        }
        long aiSynthesisDuration = System.currentTimeMillis() - t10;

        // Step 11: DB Persistence Update for Raw Updates
        updateRawIngestions(runId, importanceAssessedUpdates);

        long totalDurationMs = System.currentTimeMillis() - startTime;
        LocalDateTime endLocalTime = LocalDateTime.now();

        Map<String, Long> stages = new HashMap<>();
        stages.put("DiscoveryAgent", discoveryDuration);
        stages.put("ContentCleaningAgent", cleaningDuration);
        stages.put("ClassificationAgent", classificationDuration);
        stages.put("DuplicateDetectionAgent", duplicateDetectionDuration);
        stages.put("CredibilityJudgeAgent", credibilityDuration);
        stages.put("ImportanceRankingAgent", importanceDuration);
        stages.put("EntityExtractionAgent", entityExtractionDuration);
        stages.put("EventFusionAgent", eventFusionDuration);
        stages.put("RelationshipEngineAndTimeline", graphDuration);
        stages.put("AISynthesisAgent", aiSynthesisDuration);

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

        log.info("[PipelineOrchestrator] Ingestion complete. Discovered: {}, Processing Rate: {}/s",
                totalDiscovered, metrics.getProcessingRate());

        return new PipelineExecutionReport(
                runId,
                metrics,
                fusedEvents,
                errors
        );
    }

    private void updateRawIngestions(String runId, List<ImportanceAssessedUpdateDTO> assessedUpdates) {
        log.info("[PipelineOrchestrator] Updating database raw updates processing status...");
        try {
            List<RawIngestion> dbRecords = rawIngestionRepository.findAll().stream()
                    .filter(r -> r.getRunId().equals(runId))
                    .toList();

            Map<String, LocalDateTime> firstSeenMap = new HashMap<>();
            Map<String, LocalDateTime> lastUpdatedMap = new HashMap<>();
            Map<String, Set<String>> sourceNamesMap = new HashMap<>();

            for (ImportanceAssessedUpdateDTO val : assessedUpdates) {
                ValidatedUpdateDTO validated = val.getCredibilityAssessedUpdate().getValidatedUpdate();
                CleanedUpdateDTO cleaned = validated.getClassifiedUpdate().getCleanedUpdate();
                String eventId = validated.getEventId();
                LocalDateTime time = cleaned.getPublishedAt() != null ? cleaned.getPublishedAt() : cleaned.getFetchedAt();

                firstSeenMap.merge(eventId, time, (oldVal, newVal) -> newVal.isBefore(oldVal) ? newVal : oldVal);
                lastUpdatedMap.merge(eventId, time, (oldVal, newVal) -> newVal.isAfter(oldVal) ? newVal : oldVal);
                sourceNamesMap.computeIfAbsent(eventId, k -> new HashSet<>()).add(cleaned.getSourceName());
            }

            for (ImportanceAssessedUpdateDTO val : assessedUpdates) {
                CredibilityAssessedUpdateDTO credVal = val.getCredibilityAssessedUpdate();
                ValidatedUpdateDTO validated = credVal.getValidatedUpdate();
                CleanedUpdateDTO cleaned = validated.getClassifiedUpdate().getCleanedUpdate();
                CredibilityAssessment cred = credVal.getAssessment();
                ImportanceAssessment imp = val.getAssessment();
                String eventId = validated.getEventId();

                dbRecords.stream()
                        .filter(r -> r.getUrl().equalsIgnoreCase(cleaned.getSourceUrl()))
                        .findFirst()
                        .ifPresent(record -> {
                            record.setEventId(eventId);
                            record.setProcessingStatus(validated.isDuplicate()
                                    ? RawIngestion.ProcessingStatus.DUPLICATE
                                    : RawIngestion.ProcessingStatus.CLASSIFIED);
                            
                            record.setCredibilityScore(cred.getScore());
                            record.setCredibilityLevel(cred.getLevel().name());
                            record.setCredibilityConfidence(cred.getConfidence());
                            record.setScoreBaseline(cred.getBaselineWeight());
                            record.setScoreOfficialBonus(cred.getOfficialBonus());
                            record.setScoreAgreementBonus(cred.getAgreementBonus());
                            record.setScoreClickbaitPenalty(cred.getClickbaitPenalty());
                            record.setIsOfficial(cred.isOfficial());

                            record.setImportanceScore(imp.getScore());
                            record.setImportanceLevel(imp.getLevel().name());
                            record.setImportanceConfidence(imp.getConfidence());
                            try {
                                record.setImportanceBreakdownJson(objectMapper.writeValueAsString(imp.getScoreBreakdown()));
                                record.setImportanceReasonsJson(objectMapper.writeValueAsString(imp.getReasons()));
                            } catch (Exception ex) {
                                log.error("Serialization failed for importance JSON attributes: {}", ex.getMessage());
                            }

                            record.setEventFirstSeen(firstSeenMap.get(eventId));
                            record.setEventLastUpdated(lastUpdatedMap.get(eventId));
                            record.setEventSourceCount(sourceNamesMap.get(eventId).size());

                            rawIngestionRepository.save(record);
                        });
            }
        } catch (Exception e) {
            log.error("[PipelineOrchestrator] Failed to update raw ingestion processing statuses: {}", e.getMessage(), e);
        }
    }
}
