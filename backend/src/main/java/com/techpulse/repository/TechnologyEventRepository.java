package com.techpulse.repository;

import com.techpulse.model.TechnologyEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Spring Data JPA Repository for TechnologyEvent entities.
 */
@Repository
public interface TechnologyEventRepository extends JpaRepository<TechnologyEvent, String> {
    List<TechnologyEvent> findTop500ByOrderByFetchedAtDesc();

    List<TechnologyEvent> findTop20ByOrderByFetchedAtDescIdDesc();

    List<TechnologyEvent> findTop20ByIdNotAndEntitiesJsonContainingIgnoreCaseOrderByFetchedAtDescIdDesc(String id, String topic);

    @Query("""
            SELECT e FROM TechnologyEvent e
            WHERE (:category IS NULL OR LOWER(COALESCE(e.categoriesJson, '')) LIKE CONCAT('%', LOWER(:category), '%'))
              AND (:tech IS NULL OR LOWER(COALESCE(e.entitiesJson, '')) LIKE CONCAT('%', LOWER(:tech), '%'))
              AND (:cursorFetchedAt IS NULL OR e.fetchedAt < :cursorFetchedAt
                   OR (e.fetchedAt = :cursorFetchedAt AND e.id < :cursorId))
            ORDER BY e.fetchedAt DESC, e.id DESC
            """)
    List<TechnologyEvent> findFeedPage(
            @Param("category") String category,
            @Param("tech") String tech,
            @Param("cursorFetchedAt") LocalDateTime cursorFetchedAt,
            @Param("cursorId") String cursorId,
            Pageable pageable);

    @Query("""
            SELECT e FROM TechnologyEvent e
            WHERE LOWER(COALESCE(e.title, '')) LIKE CONCAT('%', LOWER(:query), '%')
               OR LOWER(COALESCE(e.summary, '')) LIKE CONCAT('%', LOWER(:query), '%')
               OR LOWER(COALESCE(e.entitiesJson, '')) LIKE CONCAT('%', LOWER(:query), '%')
            ORDER BY e.fetchedAt DESC, e.id DESC
            """)
    List<TechnologyEvent> searchCandidates(@Param("query") String query, Pageable pageable);
}
