package com.techpulse.repository;

import com.techpulse.model.UserHistoryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserHistoryLogRepository extends JpaRepository<UserHistoryLog, Long> {
    List<UserHistoryLog> findByUserId(Long userId);
    Optional<UserHistoryLog> findByUserIdAndEventId(Long userId, String eventId);
    void deleteByUserId(Long userId);
}
