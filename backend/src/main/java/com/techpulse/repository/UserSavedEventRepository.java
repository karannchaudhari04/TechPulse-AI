package com.techpulse.repository;

import com.techpulse.model.UserSavedEvent;
import com.techpulse.model.UserSavedEventId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface UserSavedEventRepository extends JpaRepository<UserSavedEvent, UserSavedEventId> {
    List<UserSavedEvent> findByUserId(Long userId);

    @Query("SELECT saved.eventId FROM UserSavedEvent saved WHERE saved.userId = :userId AND saved.eventId IN :eventIds")
    List<String> findEventIdsByUserIdAndEventIdIn(@Param("userId") Long userId, @Param("eventIds") List<String> eventIds);
}
