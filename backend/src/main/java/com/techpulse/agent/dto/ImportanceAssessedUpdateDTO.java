package com.techpulse.agent.dto;

import lombok.Builder;
import lombok.Value;

/**
 * DTO carrying the credibility assessed update alongside computed importance scoring indicators.
 */
@Value
@Builder
public class ImportanceAssessedUpdateDTO {
    CredibilityAssessedUpdateDTO credibilityAssessedUpdate;
    ImportanceAssessment assessment;
}
