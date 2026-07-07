package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.model.*;
import com.techpulse.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Agent parsing notification rules and registering events for users.
 */
@Service
public class NotificationAgent {

    private final NotificationRuleRepository notificationRuleRepository;
    private final NotificationEventRepository notificationEventRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public NotificationAgent(NotificationRuleRepository notificationRuleRepository,
                             NotificationEventRepository notificationEventRepository) {
        this.notificationRuleRepository = notificationRuleRepository;
        this.notificationEventRepository = notificationEventRepository;
    }

    /**
     * Matches new technology events against rules, registering alerts with correct priority levels.
     */
    @Transactional
    public void processEventNotifications(TechnologyEvent event) {
        List<NotificationRule> rules = notificationRuleRepository.findAll().stream()
                .filter(NotificationRule::getIsEnabled)
                .toList();

        for (NotificationRule rule : rules) {
            boolean triggered = false;
            String msg = "";

            if ("NEW_RELEASE".equalsIgnoreCase(rule.getTriggerType())) {
                if ("GA".equalsIgnoreCase(event.getLifecycleStatus()) || "RELEASE".equalsIgnoreCase(event.getLifecycleStatus())) {
                    List<String> entities = getEventEntities(event);
                    if (entities.stream().anyMatch(e -> e.equalsIgnoreCase(rule.getTriggerValue()))) {
                        triggered = true;
                        msg = "New release version " + event.getVersionString() + " for " + rule.getTriggerValue();
                    }
                }
            } else if ("CRITICAL_CVE".equalsIgnoreCase(rule.getTriggerType())) {
                if (event.getSecurityNotes() != null && event.getSecurityNotes().toLowerCase().contains("cve")) {
                    triggered = true;
                    msg = "Security vulnerability alert: " + event.getTitle();
                }
            } else if ("BREAKING_API_CHANGE".equalsIgnoreCase(rule.getTriggerType())) {
                if (event.getBreakingChanges() != null && !event.getBreakingChanges().equalsIgnoreCase("None detected.")) {
                    triggered = true;
                    msg = "Breaking change warning: " + event.getTitle();
                }
            }

            if (triggered) {
                NotificationEvent notification = NotificationEvent.builder()
                        .userId(rule.getUserId())
                        .title("TechPulse Advisory: " + rule.getTriggerType())
                        .message(msg)
                        .priority(rule.getPriority())
                        .eventId(event.getId())
                        .isRead(false)
                        .build();
                notificationEventRepository.save(notification);
            }
        }
    }

    private List<String> getEventEntities(TechnologyEvent event) {
        if (event.getEntitiesJson() == null) return Collections.emptyList();
        try {
            List<?> raw = objectMapper.readValue(event.getEntitiesJson(), List.class);
            return raw.stream().map(String::valueOf).toList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
