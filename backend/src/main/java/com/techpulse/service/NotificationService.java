package com.techpulse.service;

import com.techpulse.model.TechnologyEvent;

/**
 * Service interface managing event alerts and user push notification dispatches.
 */
public interface NotificationService {
    void processEventNotifications(TechnologyEvent event);
}
