package com.techpulse.repository;

import com.techpulse.model.RawIngestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository interface for raw_ingestion database queries and operations.
 */
@Repository
public interface RawIngestionRepository extends JpaRepository<RawIngestion, String> {

    /**
     * Deletes all raw ingestion entries that are marked as PROCESSED or DUPLICATE and older than the cutoff date.
     *
     * @param cutoff the threshold datetime
     * @return the number of pruned rows
     */
    @Transactional
    @Modifying
    @Query("DELETE FROM RawIngestion r WHERE r.fetchedAt < :cutoff AND (r.processingStatus = 'PROCESSED' OR r.processingStatus = 'DUPLICATE')")
    int pruneOldProcessed(@Param("cutoff") LocalDateTime cutoff);

    /**
     * Memory-efficient Spring Data JPA projection for candidate deduplication.
     * Avoids hydrating large LONGTEXT rawContent columns into the Hibernate 1st-level cache.
     */
    public interface CandidateProjection {
        String getTitle();
        LocalDateTime getPublishedAt();
        LocalDateTime getFetchedAt();
        String getEventId();
    }

    /**
     * Finds recent raw ingestion entries for deduplication mapping using lightweight projection.
     */
    @Query("SELECT r.title AS title, r.publishedAt AS publishedAt, r.fetchedAt AS fetchedAt, r.eventId AS eventId FROM RawIngestion r WHERE r.fetchedAt >= :since")
    List<CandidateProjection> findRecentCandidateProjections(@Param("since") LocalDateTime since);

    /**
     * Legacy full-entity query kept for test backward-compatibility.
     */
    @Query("SELECT r FROM RawIngestion r WHERE r.fetchedAt >= :since")
    List<RawIngestion> findRecentRawIngestions(@Param("since") LocalDateTime since);

    java.util.Optional<RawIngestion> findByUrlHash(String urlHash);
    java.util.Optional<RawIngestion> findFirstByEventIdOrderByFetchedAtDesc(String eventId);
    java.util.List<RawIngestion> findByTitleHash(String titleHash);
    boolean existsByUrlHash(String urlHash);

    @Query("SELECT COUNT(r) FROM RawIngestion r WHERE r.fetchedAt >= :start AND r.fetchedAt < :end")
    long countFetchedBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * Deletes raw ingestion records stuck in FAILED status older than the cutoff.
     * Used by PruningScheduler to clean up records that exhausted all retries.
     */
    @Transactional
    @Modifying
    @Query("DELETE FROM RawIngestion r WHERE r.fetchedAt < :cutoff AND r.processingStatus = 'FAILED'")
    int pruneOldFailed(@Param("cutoff") LocalDateTime cutoff);

    /**
     * Deletes any raw ingestion records that are not PROCESSED.
     * Guarantees only clean PROCESSED records remain in the database.
     */
    @Transactional
    @Modifying
    @Query("DELETE FROM RawIngestion r WHERE r.processingStatus != 'PROCESSED'")
    int deleteUnprocessed();

    // Legacy method kept for backward-compatibility (used in tests)
    java.util.List<RawIngestion> findTop50ByProcessingStatusOrderByFetchedAtAsc(RawIngestion.ProcessingStatus status);
}
