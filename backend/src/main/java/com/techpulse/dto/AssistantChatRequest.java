package com.techpulse.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AssistantChatRequest(
        @NotBlank(message = "prompt is required")
        @Size(max = 4000, message = "prompt must be at most 4000 characters")
        String prompt,
        @Size(max = 20, message = "history may contain at most 20 messages")
        List<@Valid HistoryMessage> history,
        @Size(max = 80, message = "conversationId must be at most 80 characters")
        String conversationId) {

    public record HistoryMessage(
            @NotBlank
            @Pattern(regexp = "user|assistant", message = "history role must be user or assistant")
            String role,
            @NotBlank
            @Size(max = 4000, message = "history content must be at most 4000 characters")
            String content) {
    }
}
