package com.techpulse.agent;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Context object carrying execution details throughout the ingestion pipeline.
 */
public record PipelineContext(
    String runId,
    LocalDateTime startedAt,
    Map<String, Object> metadata
) {}
