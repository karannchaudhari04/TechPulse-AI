package com.techpulse.repository;

import com.techpulse.model.UserSavedEvent;
import com.techpulse.model.UserSavedEventId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserSavedEventRepository extends JpaRepository<UserSavedEvent, UserSavedEventId> {
    List<UserSavedEvent> findByUserId(Long userId);
}
