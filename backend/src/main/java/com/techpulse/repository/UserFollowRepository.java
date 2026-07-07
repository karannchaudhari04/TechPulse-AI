package com.techpulse.repository;

import com.techpulse.model.UserFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserFollowRepository extends JpaRepository<UserFollow, Long> {
    List<UserFollow> findByUserId(Long userId);
    Optional<UserFollow> findByUserIdAndEntityNameAndEntityType(Long userId, String entityName, String entityType);
}
