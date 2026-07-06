package com.techpulse.service;

import com.techpulse.repository.RawIngestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Service that handles daily scheduled pruning of processed/duplicate raw records.
 */
@Service
public class PruningScheduler {

    private static final Logger log = LoggerFactory.getLogger(PruningScheduler.class);
    private final RawIngestionRepository rawIngestionRepository;

    public PruningScheduler(RawIngestionRepository rawIngestionRepository) {
        this.rawIngestionRepository = rawIngestionRepository;
    }

    /**
     * Deletes raw updates that are processed or duplicates and older than 14 days.
     * Runs automatically at midnight every day.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void pruneRawIngestions() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(14);
        log.info("[PruningScheduler] Starting daily pruning of raw updates older than 14 days (cutoff: {})", cutoff);
        try {
            int deletedCount = rawIngestionRepository.pruneOldProcessed(cutoff);
            log.info("[PruningScheduler] Successfully pruned {} raw ingestion rows.", deletedCount);
        } catch (Exception e) {
            log.error("[PruningScheduler] Error pruning raw ingestions: {}", e.getMessage(), e);
        }
    }
}
