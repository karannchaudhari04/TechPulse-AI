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
     * Also cleans up FAILED records (exhausted retries) older than 3 days.
     * Runs automatically at midnight every day.
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void pruneRawIngestions() {
        LocalDateTime processedCutoff = LocalDateTime.now().minusDays(14);
        LocalDateTime failedCutoff = LocalDateTime.now().minusDays(3);

        log.info("[PruningScheduler] Starting daily pruning. Processed cutoff: {}, Failed cutoff: {}", processedCutoff, failedCutoff);
        try {
            int deletedProcessed = rawIngestionRepository.pruneOldProcessed(processedCutoff);
            log.info("[PruningScheduler] Pruned {} PROCESSED/DUPLICATE raw ingestion rows.", deletedProcessed);
        } catch (Exception e) {
            log.error("[PruningScheduler] Error pruning processed raw ingestions: {}", e.getMessage(), e);
        }
        try {
            int deletedFailed = rawIngestionRepository.pruneOldFailed(failedCutoff);
            log.info("[PruningScheduler] Pruned {} FAILED raw ingestion rows (exhausted retries).", deletedFailed);
        } catch (Exception e) {
            log.error("[PruningScheduler] Error pruning failed raw ingestions: {}", e.getMessage(), e);
        }
    }
}
