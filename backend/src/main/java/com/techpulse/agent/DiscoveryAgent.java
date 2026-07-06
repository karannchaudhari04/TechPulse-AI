package com.techpulse.agent;

import com.techpulse.agent.collector.SourceCollector;
import com.techpulse.agent.dto.DiscoveryResult;
import com.techpulse.agent.dto.RawUpdateDTO;
import com.techpulse.agent.model.SourceType;
import com.techpulse.agent.registry.SourceRegistry;
import com.techpulse.model.NewsSource;
import com.techpulse.model.RawIngestion;
import com.techpulse.repository.NewsSourceRepository;
import com.techpulse.repository.RawIngestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * DiscoveryAgent aggregates raw updates from active technology sources concurrently.
 */
@Service
public class DiscoveryAgent implements Agent<PipelineContext, DiscoveryResult> {

    private static final Logger log = LoggerFactory.getLogger(DiscoveryAgent.class);

    private final NewsSourceRepository newsSourceRepository;
    private final SourceRegistry sourceRegistry;
    private final RawIngestionRepository rawIngestionRepository;
    private final ExecutorService executorService;

    public DiscoveryAgent(NewsSourceRepository newsSourceRepository, 
                          SourceRegistry sourceRegistry, 
                          RawIngestionRepository rawIngestionRepository) {
        this.newsSourceRepository = newsSourceRepository;
        this.sourceRegistry = sourceRegistry;
        this.rawIngestionRepository = rawIngestionRepository;
        // Thread pool to handle concurrent collections (limit to 10 threads to be friendly to VM)
        this.executorService = Executors.newFixedThreadPool(10);
    }

    @Override
    public DiscoveryResult process(PipelineContext context) {
        String runId = context.runId();
        long startTime = System.currentTimeMillis();
        log.info("[DiscoveryAgent] [runId={}] Starting news discovery run...", runId);

        List<NewsSource> activeSources = newsSourceRepository.findByActiveTrue();
        int totalSources = activeSources.size();
        log.info("[DiscoveryAgent] [runId={}] Found {} active technology sources.", runId, totalSources);

        List<RawUpdateDTO> aggregatedUpdates = Collections.synchronizedList(new ArrayList<>());
        Map<String, String> failuresMap = new ConcurrentHashMap<>();

        List<CompletableFuture<Void>> futures = activeSources.stream()
                .map(source -> CompletableFuture.supplyAsync(() -> {
                    // Current news sources are all RSS-based
                    SourceType type = SourceType.RSS;
                    SourceCollector collector = sourceRegistry.getCollector(type);
                    if (collector == null) {
                        throw new IllegalStateException("No collector registered for source type: " + type);
                    }
                    return collector.collect(context, source.getName(), source.getUrl());
                }, executorService)
                .thenAccept(aggregatedUpdates::addAll)
                .exceptionally(ex -> {
                    Throwable cause = ex.getCause() != null ? ex.getCause() : ex;
                    log.error("[DiscoveryAgent] [runId={}] Collection failed for source '{}': {}", 
                            runId, source.getName(), cause.getMessage());
                    failuresMap.put(source.getUrl(), cause.getMessage());
                    return null;
                }))
                .toList();

        // Wait for all fetches to complete
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        // Persist all gathered raw updates to database in batch
        List<RawIngestion> entitiesToSave = new ArrayList<>();
        for (RawUpdateDTO dto : aggregatedUpdates) {
            RawIngestion entity = new RawIngestion();
            entity.setId(UUID.randomUUID().toString());
            entity.setRunId(runId);
            entity.setSourceName(dto.getSourceName());
            entity.setSourceType(dto.getSourceType());
            entity.setTitle(dto.getTitle());
            entity.setRawContent(dto.getRawContent());
            entity.setUrl(dto.getSourceUrl());
            entity.setCanonicalUrl(dto.getCanonicalUrl());
            entity.setPublishedAt(dto.getPublishedAt());
            entity.setFetchedAt(dto.getFetchedAt() != null ? dto.getFetchedAt() : LocalDateTime.now());
            entity.setProcessingStatus(RawIngestion.ProcessingStatus.NEW);
            entitiesToSave.add(entity);
        }

        try {
            if (!entitiesToSave.isEmpty()) {
                log.info("[DiscoveryAgent] [runId={}] Saving {} raw updates to database...", runId, entitiesToSave.size());
                rawIngestionRepository.saveAll(entitiesToSave);
                log.info("[DiscoveryAgent] [runId={}] Saved {} raw updates successfully.", runId, entitiesToSave.size());
            }
        } catch (Exception e) {
            log.error("[DiscoveryAgent] [runId={}] Failed to persist raw updates to database: {}", runId, e.getMessage(), e);
            // We want to record this failure, but not crash the dry-run metrics output if possible
            failuresMap.put("database-save", e.getMessage());
        }

        long elapsedTime = System.currentTimeMillis() - startTime;
        int failureCount = failuresMap.size();
        int successCount = totalSources - failureCount;

        log.info("[DiscoveryAgent] [runId={}] Discovery run completed in {}ms. Success: {}/{}, Failures: {}", 
                runId, elapsedTime, successCount, totalSources, failureCount);

        return new DiscoveryResult(
                runId,
                new ArrayList<>(aggregatedUpdates),
                totalSources,
                successCount,
                failureCount,
                elapsedTime,
                failuresMap
        );
    }
}
