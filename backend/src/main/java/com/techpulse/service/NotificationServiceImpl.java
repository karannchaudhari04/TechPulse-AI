package com.techpulse.service;

import com.techpulse.agent.NotificationAgent;
import com.techpulse.model.TechnologyEvent;
import org.springframework.stereotype.Service;

/**
 * Service implementation delegating notification triggers.
 */
@Service
public class NotificationServiceImpl implements NotificationService {

    private final NotificationAgent notificationAgent;

    public NotificationServiceImpl(NotificationAgent notificationAgent) {
        this.notificationAgent = notificationAgent;
    }

    @Override
    public void processEventNotifications(TechnologyEvent event) {
        notificationAgent.processEventNotifications(event);
    }
}
