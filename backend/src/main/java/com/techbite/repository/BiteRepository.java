package com.techbite.repository;

import com.techbite.model.Bite;
import com.techbite.model.Category;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

public interface BiteRepository extends JpaRepository<Bite, Long> {

    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT b FROM Bite b WHERE b.status = :status AND (:cursorDate IS NULL OR b.publishedAt < :cursorDate OR (b.publishedAt = :cursorDate AND b.id < :cursorId)) ORDER BY b.publishedAt DESC, b.id DESC")
    List<Bite> findNextPage(@Param("status") Bite.Status status, @Param("cursorDate") LocalDateTime cursorDate, @Param("cursorId") Long cursorId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT b FROM Bite b WHERE b.category.id = :categoryId AND b.status = :status AND (:cursorDate IS NULL OR b.publishedAt < :cursorDate OR (b.publishedAt = :cursorDate AND b.id < :cursorId)) ORDER BY b.publishedAt DESC, b.id DESC")
    List<Bite> findCategoryNextPage(@Param("categoryId") Long categoryId, @Param("status") Bite.Status status, @Param("cursorDate") LocalDateTime cursorDate, @Param("cursorId") Long cursorId, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    @Query("SELECT b FROM Bite b WHERE b.category IN (SELECT p FROM User u JOIN u.preferences p WHERE u.id = :userId) AND b.status = :status AND (:cursorDate IS NULL OR b.publishedAt < :cursorDate OR (b.publishedAt = :cursorDate AND b.id < :cursorId)) ORDER BY b.publishedAt DESC, b.id DESC")
    List<Bite> findForYouNextPage(@Param("userId") Long userId, @Param("status") Bite.Status status, @Param("cursorDate") LocalDateTime cursorDate, @Param("cursorId") Long cursorId, Pageable pageable);

    boolean existsByOriginalSourceUrl(String originalSourceUrl);
    boolean existsByTitle(String title);
}
