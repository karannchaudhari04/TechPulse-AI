package com.techpulse.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

/**
 * DTO representing user interest profiles weights mapping.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInterestDTO {
    private Long userId;
    private Map<String, Double> categoryInterests;
    private Map<String, Double> entityInterests;
    private String difficultyPreference;
}
