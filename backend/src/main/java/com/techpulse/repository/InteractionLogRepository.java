package com.techpulse.repository;

import com.techpulse.model.InteractionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InteractionLogRepository extends JpaRepository<InteractionLog, Long> {
    List<InteractionLog> findByUserId(Long userId);
}
