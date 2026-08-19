package com.techpulse.service;

import com.techpulse.discovery.service.DiscoveryService;
import com.techpulse.ai.service.AISynthesisService;
import com.techpulse.model.RawIngestion;
import com.techpulse.model.TechnologyEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class NewsIngestionService {

    private static final Logger log = LoggerFactory.getLogger(NewsIngestionService.class);

    private final DiscoveryService discoveryService;
    private final AISynthesisService aiSynthesisService;
    private final org.springframework.cache.CacheManager cacheManager;
    private final AtomicBoolean isIngesting = new AtomicBoolean(false);

    private LocalDateTime lastRunTime;
    private int lastSavedCount = 0;

    @Value("${app.news.ingestion.enabled:true}")
    private boolean ingestionEnabled;

    public NewsIngestionService(DiscoveryService discoveryService,
                                AISynthesisService aiSynthesisService,
                                org.springframework.cache.CacheManager cacheManager) {
        this.discoveryService = discoveryService;
        this.aiSynthesisService = aiSynthesisService;
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
            log.info("[NewsIngestion] Starting Discovery & Deduplication phase...");
            List<RawIngestion> uniqueCandidates = discoveryService.discoverAndDeduplicate();
            log.info("[NewsIngestion] Deduplication complete. Found {} unique updates to process with AI.", uniqueCandidates.size());

            int savedCount = 0;
            for (RawIngestion candidate : uniqueCandidates) {
                try {
                    // Call structured Gemini synthesis
                    TechnologyEvent event = aiSynthesisService.synthesizeAndSave(candidate);
                    if (event != null) {
                        savedCount++;
                    }
                    // Throttling sleep between Gemini calls to protect quota
                    Thread.sleep(2000);
                } catch (Exception e) {
                    log.error("[NewsIngestion] AI Synthesis failed for raw update ID '{}': {}", candidate.getId(), e.getMessage());
                }
            }

            this.lastSavedCount = savedCount;
            this.lastRunTime = LocalDateTime.now();

            if (savedCount > 0) {
                log.info("[NewsIngestion] Evicting feed and personalization caches...");
                invalidateCaches();
            }

            log.info("[NewsIngestion] Ingestion Completed. Successfully synthesized {} events.", savedCount);
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
