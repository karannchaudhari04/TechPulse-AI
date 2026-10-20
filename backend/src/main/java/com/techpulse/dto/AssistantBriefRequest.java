package com.techpulse.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AssistantBriefRequest(
        @NotBlank(message = "topic is required")
        @Size(max = 200, message = "topic must be at most 200 characters")
        String topic,
        @NotBlank(message = "format is required")
        @Pattern(regexp = "summary|technical|migration|security|markdown|pdf", flags = Pattern.Flag.CASE_INSENSITIVE,
                message = "format must be summary, technical, migration, security, markdown, or pdf")
        String format) {
}
