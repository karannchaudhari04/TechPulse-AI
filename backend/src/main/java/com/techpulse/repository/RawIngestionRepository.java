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
    java.util.List<RawIngestion> findByTitleHash(String titleHash);
    boolean existsByUrlHash(String urlHash);

    /**
     * Returns up to 50 RawIngestion records stuck in NEW status, oldest first.
     * Used by NewsIngestionService to retry failed Gemini synthesis on each ingestion cycle.
     */
    java.util.List<RawIngestion> findTop50ByProcessingStatusOrderByFetchedAtAsc(RawIngestion.ProcessingStatus status);
}
