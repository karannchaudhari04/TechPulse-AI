package com.techpulse.agent;

import com.techpulse.agent.dto.*;
import com.techpulse.model.TechnologyEvent;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test validating HallucinationValidator entity and link restrictions.
 */
public class HallucinationValidatorTest {

    @Test
    public void testHallucinationDetection() {
        HallucinationValidator validator = new HallucinationValidator();

        TechnologyEvent event = TechnologyEvent.builder()
                .id("ev-123")
                .title("Spring Boot Release")
                .entitiesJson("[\"Spring Boot\"]")
                .build();

        TechnologyEventDTO eventDto = TechnologyEventDTO.builder()
                .event(event)
                .supportingUpdates(new ArrayList<>())
                .build();

        SynthesizedTechnologyEventDTO summaryOk = SynthesizedTechnologyEventDTO.builder()
                .headline("Spring Boot Release GA")
                .summary("This GA release brings features.")
                .officialLinks(List.of())
                .build();

        assertDoesNotThrow(() -> validator.validate(eventDto, summaryOk));

        SynthesizedTechnologyEventDTO summaryHallucinated = SynthesizedTechnologyEventDTO.builder()
                .headline("Spring Boot acquires OpenAI")
                .summary("Spring Boot integrates OpenAI LLMs.")
                .officialLinks(List.of())
                .build();

        assertThrows(IllegalStateException.class, () -> validator.validate(eventDto, summaryHallucinated));
    }
}
