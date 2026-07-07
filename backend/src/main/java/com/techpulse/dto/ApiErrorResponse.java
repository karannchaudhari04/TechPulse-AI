package com.techpulse.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.slf4j.MDC;
import java.util.List;

/**
 * Standardized API Error Payload capturing paths, statuses, message logs, and request correlation IDs.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiErrorResponse {
    @Builder.Default
    private long timestamp = System.currentTimeMillis();
    private String path;
    private String errorCode;
    private String message;
    private List<String> details;
    @Builder.Default
    private String traceId = MDC.get("correlationId");
}
