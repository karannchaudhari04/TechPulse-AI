package com.techpulse.repository;

import com.techpulse.model.RecommendationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RecommendationHistoryRepository extends JpaRepository<RecommendationHistory, Long> {
    List<RecommendationHistory> findByUserId(Long userId);
}
