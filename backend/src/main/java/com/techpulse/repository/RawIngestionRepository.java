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
     * Finds recent raw ingestion entries for deduplication mapping.
     */
    @Query("SELECT r FROM RawIngestion r WHERE r.fetchedAt >= :since")
    List<RawIngestion> findRecentRawIngestions(@Param("since") LocalDateTime since);
}
