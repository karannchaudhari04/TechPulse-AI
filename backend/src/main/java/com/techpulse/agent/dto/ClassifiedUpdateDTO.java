package com.techpulse.agent.dto;

import com.techpulse.agent.model.CategoryType;
import lombok.Builder;
import lombok.Value;
import java.util.Map;

/**
 * DTO representing content that has been classified into categories with calculated confidence scores.
 */
@Value
@Builder
public class ClassifiedUpdateDTO {
    CleanedUpdateDTO cleanedUpdate;
    Map<CategoryType, Double> categoryConfidences;
}
