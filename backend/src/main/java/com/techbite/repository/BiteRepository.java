package com.techbite.repository;

import com.techbite.model.Bite;
import com.techbite.model.Category;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import org.springframework.cache.annotation.Cacheable;

public interface BiteRepository extends JpaRepository<Bite, Long> {

    @EntityGraph(attributePaths = {"category"})
    @Cacheable(value = "globalFeed", key = "#status.name() + '-' + (#cursorDate != null ? #cursorDate.toString() : 'null') + '-' + (#cursorId != null ? #cursorId : 'null')")
    @Query("SELECT b FROM Bite b WHERE b.status = :status AND (:cursorDate IS NULL OR b.publishedAt < :cursorDate OR (b.publishedAt = :cursorDate AND b.id < :cursorId)) ORDER BY b.publishedAt DESC, b.id DESC")
    List<Bite> findNextPage(@Param("status") Bite.Status status, @Param("cursorDate") LocalDateTime cursorDate, @Param("cursorId") Long cursorId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    @Cacheable(value = "categoryFeed", key = "#categoryId + '-' + #status.name() + '-' + (#cursorDate != null ? #cursorDate.toString() : 'null') + '-' + (#cursorId != null ? #cursorId : 'null')")
    @Query("SELECT b FROM Bite b WHERE b.category.id = :categoryId AND b.status = :status AND (:cursorDate IS NULL OR b.publishedAt < :cursorDate OR (b.publishedAt = :cursorDate AND b.id < :cursorId)) ORDER BY b.publishedAt DESC, b.id DESC")
    List<Bite> findCategoryNextPage(@Param("categoryId") Long categoryId, @Param("status") Bite.Status status, @Param("cursorDate") LocalDateTime cursorDate, @Param("cursorId") Long cursorId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT b FROM Bite b WHERE b.category IN (SELECT p FROM User u JOIN u.preferences p WHERE u.id = :userId) AND b.status = :status AND (:cursorDate IS NULL OR b.publishedAt < :cursorDate OR (b.publishedAt = :cursorDate AND b.id < :cursorId)) ORDER BY b.publishedAt DESC, b.id DESC")
    List<Bite> findForYouNextPage(@Param("userId") Long userId, @Param("status") Bite.Status status, @Param("cursorDate") LocalDateTime cursorDate, @Param("cursorId") Long cursorId, Pageable pageable);

    // ── Excluded-Viewed Queries for Logged-In Users ─────────────────────────

    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT b FROM Bite b WHERE b.status = :status " +
           "AND (:cursorDate IS NULL OR b.publishedAt < :cursorDate OR (b.publishedAt = :cursorDate AND b.id < :cursorId)) " +
           "AND b.id NOT IN (SELECT uv.id FROM User u JOIN u.viewedBites uv WHERE u.id = :userId " +
           "  AND uv.id NOT IN (SELECT bm.bite.id FROM Bookmark bm WHERE bm.user.id = :userId)) " +
           "ORDER BY b.publishedAt DESC, b.id DESC")
    List<Bite> findNextPageExcludeViewed(@Param("userId") Long userId, @Param("status") Bite.Status status, @Param("cursorDate") LocalDateTime cursorDate, @Param("cursorId") Long cursorId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT b FROM Bite b WHERE b.category.id = :categoryId AND b.status = :status " +
           "AND (:cursorDate IS NULL OR b.publishedAt < :cursorDate OR (b.publishedAt = :cursorDate AND b.id < :cursorId)) " +
           "AND b.id NOT IN (SELECT uv.id FROM User u JOIN u.viewedBites uv WHERE u.id = :userId " +
           "  AND uv.id NOT IN (SELECT bm.bite.id FROM Bookmark bm WHERE bm.user.id = :userId)) " +
           "ORDER BY b.publishedAt DESC, b.id DESC")
    List<Bite> findCategoryNextPageExcludeViewed(@Param("userId") Long userId, @Param("categoryId") Long categoryId, @Param("status") Bite.Status status, @Param("cursorDate") LocalDateTime cursorDate, @Param("cursorId") Long cursorId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT b FROM Bite b WHERE b.category IN (SELECT p FROM User u JOIN u.preferences p WHERE u.id = :userId) AND b.status = :status " +
           "AND (:cursorDate IS NULL OR b.publishedAt < :cursorDate OR (b.publishedAt = :cursorDate AND b.id < :cursorId)) " +
           "AND b.id NOT IN (SELECT uv.id FROM User u JOIN u.viewedBites uv WHERE u.id = :userId " +
           "  AND uv.id NOT IN (SELECT bm.bite.id FROM Bookmark bm WHERE bm.user.id = :userId)) " +
           "ORDER BY b.publishedAt DESC, b.id DESC")
    List<Bite> findForYouNextPageExcludeViewed(@Param("userId") Long userId, @Param("status") Bite.Status status, @Param("cursorDate") LocalDateTime cursorDate, @Param("cursorId") Long cursorId, Pageable pageable);

    // ── Native and JPQL Queries for user_viewed_bites ───────────────────────

    @Modifying
    @Query(value = "INSERT IGNORE INTO user_viewed_bites (user_id, bite_id, viewed_at) VALUES (:userId, :biteId, NOW())", nativeQuery = true)
    void insertViewedBite(@Param("userId") Long userId, @Param("biteId") Long biteId);

    @Query("SELECT uv.id FROM User u JOIN u.viewedBites uv WHERE u.id = :userId")
    Set<Long> findViewedBiteIdsByUserId(@Param("userId") Long userId);

    boolean existsByOriginalSourceUrl(String originalSourceUrl);
    boolean existsByTitle(String title);
}

