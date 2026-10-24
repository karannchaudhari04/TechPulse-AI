package com.techpulse.repository;

import com.techpulse.model.UserHistoryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserHistoryLogRepository extends JpaRepository<UserHistoryLog, Long> {
    List<UserHistoryLog> findByUserId(Long userId);
    Optional<UserHistoryLog> findByUserIdAndEventId(Long userId, String eventId);
    @Query("SELECT history.eventId FROM UserHistoryLog history WHERE history.userId = :userId AND history.eventId IN :eventIds AND history.completionPercentage >= 100")
    List<String> findCompletedEventIdsByUserIdAndEventIdIn(@Param("userId") Long userId, @Param("eventIds") List<String> eventIds);
    void deleteByUserId(Long userId);
}
