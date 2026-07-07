package com.techpulse.agent.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

/**
 * DTO carrying the importance assessed updates alongside parsed named entity lists.
 */
@Value
@Builder
public class EntityExtractedUpdateDTO {
    ImportanceAssessedUpdateDTO importanceAssessedUpdate;
    List<ExtractedEntity> entities;

    /**
     * Inner class representing parsed named entity attributes.
     */
    @Value
    @Builder
    public static class ExtractedEntity {
        String name;
        String normalizedName;
        String type;
    }
}
