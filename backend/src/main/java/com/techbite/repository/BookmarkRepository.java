package com.techbite.repository;

import com.techbite.model.Bookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    @Query("SELECT bm FROM Bookmark bm JOIN FETCH bm.bite b LEFT JOIN FETCH b.category WHERE bm.user.id = :userId ORDER BY bm.createdAt DESC")
    Page<Bookmark> findByUserId(@Param("userId") Long userId, Pageable pageable);

    Optional<Bookmark> findByUserIdAndBiteId(Long userId, Long biteId);

    void deleteByUserIdAndBiteId(Long userId, Long biteId);

    boolean existsByUserIdAndBiteId(Long userId, Long biteId);

    void deleteByCreatedAtBefore(java.time.LocalDateTime expiryDate);

    long countByUserId(Long userId);
}
