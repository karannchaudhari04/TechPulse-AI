package com.techpulse.agent.dto;

import java.util.List;
import java.util.Map;

/**
 * Execution report returned by the pipeline orchestrator outlining performance metrics and updates.
 */
public record PipelineExecutionReport(
    String runId,
    PipelineMetrics metrics,
    List<CredibilityAssessedUpdateDTO> processedUpdates,
    Map<String, String> errors
) {}
