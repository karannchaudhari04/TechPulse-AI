package com.techpulse.agent.dto;

import java.util.List;
import java.util.Map;

/**
 * Common interface representing structural fields for all pipeline score assessments.
 */
public interface ScoreAssessment {
    double getScore();
    double getConfidence();
    List<?> getReasons();
    List<String> getEvidence();
    Map<String, Double> getScoreBreakdown();
    Map<String, Object> getMetadata();
}
