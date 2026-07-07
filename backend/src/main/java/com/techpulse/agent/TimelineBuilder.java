package com.techpulse.agent;

import com.techpulse.agent.dto.*;
import com.techpulse.model.EventTimeline;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.EventTimelineRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service responsible for mapping event updates to entity chronological release timelines.
 */
@Service
public class TimelineBuilder {

    private static final Logger log = LoggerFactory.getLogger(TimelineBuilder.class);

    private final EventTimelineRepository eventTimelineRepository;

    public TimelineBuilder(EventTimelineRepository eventTimelineRepository) {
        this.eventTimelineRepository = eventTimelineRepository;
    }

    /**
     * Inserts timeline entries for all entities in the event.
     */
    public void recordTimeline(TechnologyEventDTO eventDto) {
        TechnologyEvent event = eventDto.getEvent();
        List<EntityExtractedUpdateDTO> updates = eventDto.getSupportingUpdates();
        if (updates == null || updates.isEmpty()) {
            return;
        }

        Set<String> entities = new HashSet<>();
        for (EntityExtractedUpdateDTO u : updates) {
            for (EntityExtractedUpdateDTO.ExtractedEntity ent : u.getEntities()) {
                entities.add(ent.getName());
            }
        }

        for (String entity : entities) {
            EventTimeline timeline = EventTimeline.builder()
                    .id(UUID.randomUUID().toString())
                    .entityName(entity)
                    .eventId(event.getId())
                    .lifecycleType(mapLifecycleType(event.getLifecycleStatus()))
                    .version(event.getVersionString())
                    .eventTimestamp(event.getLastUpdated())
                    .build();
            eventTimelineRepository.save(timeline);
        }
    }

    private String mapLifecycleType(String status) {
        if (status == null) return "UNKNOWN";
        switch (status.toUpperCase()) {
            case "RC":
                return "RELEASE_CANDIDATE";
            case "BETA":
                return "PREVIEW";
            case "ANNOUNCED":
                return "ANNOUNCEMENT";
            case "GA":
                return "GA_RELEASE";
            case "PATCH":
                return "PATCH";
            case "SECURITY_FIX":
                return "SECURITY_UPDATE";
            default:
                return "UNKNOWN";
        }
    }
}
