package com.techpulse.service;

import com.techpulse.agent.DiscoveryAgent;
import com.techpulse.agent.AISynthesisAgent;
import com.techpulse.model.RawIngestion;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.RawIngestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class NewsIngestionService {

    private static final Logger log = LoggerFactory.getLogger(NewsIngestionService.class);

    private final DiscoveryAgent discoveryAgent;
    private final AISynthesisAgent aiSynthesisAgent;
    private final RawIngestionRepository rawIngestionRepository;
    private final org.springframework.cache.CacheManager cacheManager;
    private final AtomicBoolean isIngesting = new AtomicBoolean(false);

    private LocalDateTime lastRunTime;
    private int lastSavedCount = 0;

    @Value("${app.news.ingestion.enabled:true}")
    private boolean ingestionEnabled;

    public NewsIngestionService(DiscoveryAgent discoveryAgent,
                                AISynthesisAgent aiSynthesisAgent,
                                RawIngestionRepository rawIngestionRepository,
                                org.springframework.cache.CacheManager cacheManager) {
        this.discoveryAgent = discoveryAgent;
        this.aiSynthesisAgent = aiSynthesisAgent;
        this.rawIngestionRepository = rawIngestionRepository;
        this.cacheManager = cacheManager;
    }

    public Map<String, Object> getStatus() {
        return Map.of(
            "lastRun", lastRunTime != null ? lastRunTime.toString() : "Never",
            "lastSavedCount", lastSavedCount
        );
    }

    @Scheduled(cron = "0 0 */4 * * *")
    @SchedulerLock(
        name = "NewsIngestion_scheduledIngest", 
        lockAtMostFor = "15m", 
        lockAtLeastFor = "5m"
    )
    public void scheduledIngest() {
        if (!ingestionEnabled) {
            log.info("[NewsIngestion] Scheduled run skipped (disabled in config)");
            return;
        }
        log.info("[NewsIngestion] Scheduled run started at {}", LocalDateTime.now());
        ingestAllFeeds();
    }

    @Async
    public void ingestAllFeeds() {
        if (!isIngesting.compareAndSet(false, true)) {
            log.warn("[NewsIngestion] Ingestion already in progress. Skipping.");
            return;
        }
        try {
            // ── Phase 0: Retry pending NEW records from previous failed Gemini calls ──────
            List<RawIngestion> pendingRetries = rawIngestionRepository
                    .findTop50ByProcessingStatusOrderByFetchedAtAsc(RawIngestion.ProcessingStatus.NEW);

            int retryCount = pendingRetries.size();
            int retrySuccessCount = 0;

            if (!pendingRetries.isEmpty()) {
                log.info("[NewsIngestion] Found {} pending NEW records to retry with AISynthesisAgent.", retryCount);
                for (RawIngestion pending : pendingRetries) {
                    try {
                        TechnologyEvent event = aiSynthesisAgent.synthesizeAndSave(pending);
                        if (event != null) {
                            retrySuccessCount++;
                        }
                        Thread.sleep(2000);
                    } catch (Exception e) {
                        log.error("[NewsIngestion] Retry synthesis failed for raw update ID '{}': {}", pending.getId(), e.getMessage());
                    }
                }
                log.info("[NewsIngestion] Retry phase complete. Succeeded: {}/{}", retrySuccessCount, retryCount);
            } else {
                log.info("[NewsIngestion] No pending NEW records to retry.");
            }

            // ── Phase 1: Fresh RSS Discovery ─────────────────────────────────────────────
            log.info("[NewsIngestion] Starting Discovery & Deduplication phase via DiscoveryAgent...");
            List<RawIngestion> uniqueCandidates = discoveryAgent.discoverAndDeduplicate();
            log.info("[NewsIngestion] Deduplication complete. Found {} unique updates to process with AISynthesisAgent.", uniqueCandidates.size());

            // ── Phase 2: Synthesize newly discovered articles ────────────────────────────
            int savedCount = 0;
            for (RawIngestion candidate : uniqueCandidates) {
                try {
                    TechnologyEvent event = aiSynthesisAgent.synthesizeAndSave(candidate);
                    if (event != null) {
                        savedCount++;
                    }
                    Thread.sleep(2000);
                } catch (Exception e) {
                    log.error("[NewsIngestion] AI Synthesis failed for raw update ID '{}': {}", candidate.getId(), e.getMessage());
                }
            }

            this.lastSavedCount = savedCount;
            this.lastRunTime = LocalDateTime.now();

            if (savedCount > 0 || retrySuccessCount > 0) {
                log.info("[NewsIngestion] Evicting feed and personalization caches...");
                invalidateCaches();
            }

            log.info("[NewsIngestion] Ingestion Completed. Retried: {}/{} | Fresh synthesized: {}",
                    retrySuccessCount, retryCount, savedCount);
        } finally {
            isIngesting.set(false);
        }
    }

    private void invalidateCaches() {
        String[] caches = {"personalizedFeed", "globalFeed", "categoryFeed", "trends", "totalBiteCount"};
        for (String cName : caches) {
            org.springframework.cache.Cache cache = cacheManager.getCache(cName);
            if (cache != null) {
                cache.clear();
            }
        }
    }
}
