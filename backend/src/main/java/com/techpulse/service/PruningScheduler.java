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
     * Also immediately wipes any leftover unprocessed records so DB stays pristine.
     * Runs automatically at midnight every day.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void pruneRawIngestions() {
        LocalDateTime processedCutoff = LocalDateTime.now().minusDays(14);

        log.info("[PruningScheduler] Starting daily pruning of raw ingestion table (processed cutoff: {})", processedCutoff);
        try {
            int deletedProcessed = rawIngestionRepository.pruneOldProcessed(processedCutoff);
            log.info("[PruningScheduler] Pruned {} old PROCESSED raw ingestion rows.", deletedProcessed);
        } catch (Exception e) {
            log.error("[PruningScheduler] Error pruning processed raw ingestions: {}", e.getMessage(), e);
        }
        try {
            int deletedUnprocessed = rawIngestionRepository.deleteUnprocessed();
            if (deletedUnprocessed > 0) {
                log.info("[PruningScheduler] Cleaned up {} leftover unprocessed/failed raw ingestion rows.", deletedUnprocessed);
            }
        } catch (Exception e) {
            log.error("[PruningScheduler] Error cleaning unprocessed raw ingestions: {}", e.getMessage(), e);
        }
    }
}
