package com.techbite.repository;

import com.techbite.model.Bite;
import com.techbite.model.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Set;

public interface BiteRepository extends JpaRepository<Bite, Long> {

    Page<Bite> findByStatusOrderByPublishedAtDesc(Bite.Status status, Pageable pageable);
    Page<Bite> findAllByStatusOrderByIdDesc(Bite.Status status, Pageable pageable);

    Page<Bite> findByCategoryIdAndStatusOrderByPublishedAtDesc(Long categoryId, Bite.Status status, Pageable pageable);

    @Query("SELECT b FROM Bite b WHERE b.category IN (SELECT p FROM User u JOIN u.preferences p WHERE u.id = :userId) AND b.status = :status ORDER BY b.id DESC")
    Page<Bite> findForYouFeedByUserId(
            @Param("userId") Long userId, 
            @Param("status") Bite.Status status, 
            Pageable pageable);

    boolean existsByOriginalSourceUrl(String originalSourceUrl);
    boolean existsByTitle(String title);
}
