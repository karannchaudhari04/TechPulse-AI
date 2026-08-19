package com.techpulse.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.model.NotificationEvent;
import com.techpulse.model.NotificationRule;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.NotificationEventRepository;
import com.techpulse.repository.NotificationRuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

/**
 * Service implementation managing user notifications matching rules.
 */
@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final NotificationRuleRepository notificationRuleRepository;
    private final NotificationEventRepository notificationEventRepository;
    private final ObjectMapper objectMapper;

    public NotificationServiceImpl(NotificationRuleRepository notificationRuleRepository,
                                   NotificationEventRepository notificationEventRepository) {
        this.notificationRuleRepository = notificationRuleRepository;
        this.notificationEventRepository = notificationEventRepository;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    @Transactional
    public void processEventNotifications(TechnologyEvent event) {
        log.info("[NotificationService] Processing rules matching event ID: {}", event.getId());
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
                log.info("[NotificationService] Triggered rule advisory for user ID: {}", rule.getUserId());
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
