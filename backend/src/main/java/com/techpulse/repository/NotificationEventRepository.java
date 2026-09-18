package com.techpulse.repository;

import com.techpulse.model.NotificationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationEventRepository extends JpaRepository<NotificationEvent, Long> {
    List<NotificationEvent> findByUserIdOrderBySentAtDesc(Long userId);
    long countByUserIdAndIsReadFalse(Long userId);
    void deleteByUserId(Long userId);

    @Modifying
    @Query("UPDATE NotificationEvent n SET n.isRead = true WHERE n.userId = :userId")
    void markAllAsReadForUser(@Param("userId") Long userId);
}
