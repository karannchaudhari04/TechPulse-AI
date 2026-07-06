package com.techpulse.agent.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

/**
 * Detailed pipeline performance and data processing metrics model.
 */
@Value
@Builder
public class PipelineMetrics {
    String runId;
    LocalDateTime startTime;
    LocalDateTime endTime;
    long totalDurationMs;
    long discoveryDurationMs;
    long cleaningDurationMs;
    long classificationDurationMs;
    long duplicateDetectionDurationMs;
    long sourcesProcessed;
    long successfulSources;
    long failedSources;
    long updatesDiscovered;
    long updatesAccepted;
    long updatesRejected;
    long duplicatesDetected;
    long newEventsCreated;
    double processingRate;
    
    String slowestAgentName;
    long slowestAgentDurationMs;
    String fastestAgentName;
    long fastestAgentDurationMs;
}
