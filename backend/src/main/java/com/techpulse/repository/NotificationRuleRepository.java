package com.techpulse.repository;

import com.techpulse.model.NotificationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRuleRepository extends JpaRepository<NotificationRule, Long> {
    List<NotificationRule> findByUserId(Long userId);
    List<NotificationRule> findByTriggerTypeAndIsEnabled(String triggerType, boolean isEnabled);
}
