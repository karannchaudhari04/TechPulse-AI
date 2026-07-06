package com.techpulse.agent.dto;

import lombok.Builder;
import lombok.Value;

/**
 * DTO representing updates processed by the CredibilityJudgeAgent.
 */
@Value
@Builder
public class CredibilityAssessedUpdateDTO {
    ValidatedUpdateDTO validatedUpdate;
    CredibilityAssessment assessment;
}
