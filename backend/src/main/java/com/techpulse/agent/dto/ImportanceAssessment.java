package com.techpulse.agent.dto;

import com.techpulse.agent.model.ImportanceLevel;
import com.techpulse.agent.model.ImportanceReason;
import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;

/**
 * Model class encapsulating importance scoring breakdown, level, and confidence indicators.
 */
@Value
@Builder
public class ImportanceAssessment implements ScoreAssessment {
    double score;
    double confidence;
    ImportanceLevel level;
    List<ImportanceReason> reasons;
    List<String> evidence;
    Map<String, Double> scoreBreakdown;
    Map<String, Object> metadata;

    @Override
    public Map<String, Object> getMetadata() {
        return metadata;
    }
}
