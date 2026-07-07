package com.techpulse.agent.dto;

import com.techpulse.model.TechnologyEvent;
import lombok.Builder;
import lombok.Value;

import java.util.List;

/**
 * DTO carrying the TechnologyEvent metadata together with its supporting updates.
 */
@Value
@Builder
public class TechnologyEventDTO {
    TechnologyEvent event;
    List<EntityExtractedUpdateDTO> supportingUpdates;
}
