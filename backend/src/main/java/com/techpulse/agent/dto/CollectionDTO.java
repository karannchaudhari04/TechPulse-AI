package com.techpulse.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * DTO mapping user collections and folder structures.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectionDTO {
    private Long id;
    private String name;
    private String description;
    private Boolean isAutoUpdating;
    private List<String> matchingEvents;
}
