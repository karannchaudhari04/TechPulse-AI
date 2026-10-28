package com.techpulse.controller;

import com.techpulse.dto.ApiResponse;
import com.techpulse.agent.AssistantGeminiClient;
import com.techpulse.agent.dto.AIRequest;
import com.techpulse.agent.dto.AIResponse;
import com.techpulse.dto.AssistantChatRequest;
import jakarta.validation.Valid;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.time.Instant;

@RestController
@RequestMapping("/api/v1/assistant")
public class AssistantController {

    private final AssistantGeminiClient aiClient;
    private final ObjectMapper objectMapper;

    public AssistantController(AssistantGeminiClient aiClient, ObjectMapper objectMapper) {
        this.aiClient = aiClient;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<Map<String, Object>>> chat(@Valid @RequestBody AssistantChatRequest request) {
        String prompt = request.prompt().trim();
        List<AssistantChatRequest.HistoryMessage> history = request.history() == null ? List.of() : request.history();
        
        StringBuilder context = new StringBuilder();
        for (AssistantChatRequest.HistoryMessage msg : history) {
            context.append(msg.role()).append(": ").append(msg.content()).append("\n");
        }
        context.append("user: ").append(prompt).append("\n");
        if (context.length() > 12000) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Conversation context must be at most 12000 characters."));
        }

        AIRequest aiRequest = AIRequest.builder()
                .systemPrompt("You are Antigravity, a professional technology and coding assistant. Help developers answer questions, explain errors, or migrate versions. Return the answer in a JSON object with a single field 'content' containing the response text.")
                .userPrompt(context.toString())
                .temperature(0.7)
                .maxTokens(1200)
                .build();

        AIResponse response = aiClient.generate(aiRequest);

        String rawContent = response.getContent();
        String message = rawContent;
        try {
            if (rawContent.trim().startsWith("{")) {
                com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(rawContent);
                if (node.has("content")) {
                    message = node.get("content").asText();
                } else if (node.has("response")) {
                    message = node.get("response").asText();
                } else if (node.has("text")) {
                    message = node.get("text").asText();
                }
            }
        } catch (Exception e) {
            // fallback
        }

        Map<String, Object> assistantMessage = new LinkedHashMap<>();
        assistantMessage.put("id", UUID.randomUUID().toString());
        assistantMessage.put("role", "assistant");
        assistantMessage.put("content", message);
        assistantMessage.put("status", "completed");
        assistantMessage.put("messageType", "markdown");
        assistantMessage.put("createdAt", Instant.now().toString());
        assistantMessage.put("citations", List.of());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("conversationId", request.conversationId() == null || request.conversationId().isBlank()
                ? UUID.randomUUID().toString() : request.conversationId());
        data.put("title", prompt.length() > 80 ? prompt.substring(0, 77) + "..." : prompt);
        data.put("persisted", false);
        data.put("message", assistantMessage);

        return ResponseEntity.ok(ApiResponse.success(data, "Chat response generated successfully"));
    }

    @PostMapping("/feedback")
    public ResponseEntity<ApiResponse<Map<String, Object>>> feedback(@RequestBody Map<String, Object> request) {
        Map<String, Object> data = new HashMap<>();
        data.put("status", "SUCCESS");
        return ResponseEntity.ok(ApiResponse.success(data, "Feedback received successfully"));
    }

    @PostMapping("/regenerate")
    public ResponseEntity<ApiResponse<Object>> regenerate() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(
                "Conversation messages are not persisted by the server. Resend the prompt to /chat to generate a new response."));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHistory() {
        return ResponseEntity.ok(ApiResponse.success(Map.of("persisted", false, "conversations", List.of()),
                "Conversation history is not persisted by the server."));
    }
}
