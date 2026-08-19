package com.techpulse.personalization.service;

import com.techpulse.model.TechnologyEvent;
import java.util.List;

public interface PersonalizationService {
    /**
     * Records a user interaction, updates their interest profile dynamically,
     * and logs reading history metrics where applicable.
     */
    void recordInteraction(Long userId, String eventId, String type, String value);

    /**
     * Ranks a list of candidate technology events for a specific user,
     * taking into account their interest profile, event importance, quality, and recency.
     */
    List<TechnologyEvent> rankEvents(Long userId, List<TechnologyEvent> candidates);
}
