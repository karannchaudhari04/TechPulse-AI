package com.techpulse.repository;

import com.techpulse.model.NotificationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationEventRepository extends JpaRepository<NotificationEvent, Long> {
    List<NotificationEvent> findByUserId(Long userId);
}
