package com.techpulse.agent;

import com.techpulse.agent.dto.*;
import com.techpulse.model.EventTimeline;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.EventTimelineRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test validating TimelineBuilder chronological release tracking.
 */
public class TimelineBuilderTest {

    @Test
    public void testTimelineRecording() {
        EventTimelineRepository timelineRepo = mock(EventTimelineRepository.class);
        TimelineBuilder builder = new TimelineBuilder(timelineRepo);

        TechnologyEvent event = TechnologyEvent.builder()
                .id("ev-123")
                .title("GPT-6 GA Stable Release")
                .lifecycleStatus("GA")
                .versionString("GPT-6")
                .lastUpdated(LocalDateTime.now())
                .build();

        EntityExtractedUpdateDTO ext = EntityExtractedUpdateDTO.builder()
                .entities(List.of(
                        EntityExtractedUpdateDTO.ExtractedEntity.builder()
                                .name("GPT-6")
                                .normalizedName("gpt6")
                                .type("AI_MODEL")
                                .build()
                ))
                .build();

        TechnologyEventDTO dto = TechnologyEventDTO.builder()
                .event(event)
                .supportingUpdates(List.of(ext))
                .build();

        builder.recordTimeline(dto);

        verify(timelineRepo, times(1)).save(argThat(timeline -> {
            assertEquals("GPT-6", timeline.getEntityName());
            assertEquals("ev-123", timeline.getEventId());
            assertEquals("GA_RELEASE", timeline.getLifecycleType());
            assertEquals("GPT-6", timeline.getVersion());
            return true;
        }));
    }
}
