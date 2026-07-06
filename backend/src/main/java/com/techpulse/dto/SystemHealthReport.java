package com.techpulse.dto;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Health report carrying system components readiness details.
 */
public record SystemHealthReport(
    String status,
    LocalDateTime timestamp,
    Map<String, String> components
) {}
