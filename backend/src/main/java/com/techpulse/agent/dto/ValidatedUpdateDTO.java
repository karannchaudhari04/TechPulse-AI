package com.techpulse.agent.dto;

import lombok.Builder;
import lombok.Value;

/**
 * DTO representing deduplicated update with assigned Event ID, match score, and match details.
 */
@Value
@Builder
public class ValidatedUpdateDTO {
    ClassifiedUpdateDTO classifiedUpdate;
    String eventId;
    boolean isDuplicate;
    double matchScore;
    String matchReason;
    String duplicateOfUrl;
}
