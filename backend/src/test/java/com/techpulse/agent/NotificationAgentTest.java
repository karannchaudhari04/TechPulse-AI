package com.techpulse.agent;

import com.techpulse.model.NotificationEvent;
import com.techpulse.model.NotificationRule;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.NotificationEventRepository;
import com.techpulse.repository.NotificationRuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class NotificationAgentTest {

    private NotificationRuleRepository notificationRuleRepository;
    private NotificationEventRepository notificationEventRepository;
    private NotificationAgent notificationAgent;

    @BeforeEach
    public void setUp() {
        notificationRuleRepository = mock(NotificationRuleRepository.class);
        notificationEventRepository = mock(NotificationEventRepository.class);
        notificationAgent = new NotificationAgent(notificationRuleRepository, notificationEventRepository);
    }

    @Test
    public void testProcessEventNotifications() {
        TechnologyEvent event = TechnologyEvent.builder()
                .id("event-1")
                .title("New AWS release GA")
                .lifecycleStatus("GA")
                .entitiesJson("[\"AWS\"]")
                .build();

        NotificationRule rule = NotificationRule.builder()
                .id(1L)
                .userId(1L)
                .triggerType("NEW_RELEASE")
                .triggerValue("AWS")
                .priority("HIGH")
                .isEnabled(true)
                .build();

        when(notificationRuleRepository.findAll()).thenReturn(List.of(rule));

        notificationAgent.processEventNotifications(event);

        verify(notificationEventRepository, times(1)).save(any(NotificationEvent.class));
    }
}
