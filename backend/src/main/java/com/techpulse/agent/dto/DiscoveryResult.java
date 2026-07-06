package com.techpulse.agent.dto;

import java.util.List;
import java.util.Map;

/**
 * Result returned by the DiscoveryAgent containing gathered updates and performance metrics.
 */
public record DiscoveryResult(
    String runId,
    List<RawUpdateDTO> updates,
    int totalSources,
    int successCount,
    int failureCount,
    long elapsedTimeMs,
    Map<String, String> failures
) {}
