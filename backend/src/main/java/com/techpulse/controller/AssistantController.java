package com.techpulse.controller;

import com.techpulse.dto.ApiResponse;
import com.techpulse.agent.AIClient;
import com.techpulse.agent.dto.AIRequest;
import com.techpulse.agent.dto.AIResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/assistant")
public class AssistantController {

    private final AIClient aiClient;

    public AssistantController(AIClient aiClient) {
        this.aiClient = aiClient;
    }

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<Map<String, Object>>> chat(@RequestBody Map<String, Object> request) {
        String prompt = (String) request.get("message");
        List<Map<String, String>> history = (List<Map<String, String>>) request.get("history");
        
        StringBuilder context = new StringBuilder();
        if (history != null) {
            for (Map<String, String> msg : history) {
                context.append(msg.get("role")).append(": ").append(msg.get("content")).append("\n");
            }
        }
        context.append("user: ").append(prompt).append("\n");

        AIRequest aiRequest = AIRequest.builder()
                .systemPrompt("You are Antigravity, a professional technology and coding assistant. Help developers answer questions, explain errors, or migrate versions. Return the answer in a JSON object with a single field 'content' containing the response text.")
                .userPrompt(context.toString())
                .temperature(0.7)
                .build();

        AIResponse response = aiClient.generate(aiRequest);

        String rawContent = response.getContent();
        String message = rawContent;
        try {
            if (rawContent.trim().startsWith("{")) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(rawContent);
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

        Map<String, Object> data = new HashMap<>();
        data.put("id", UUID.randomUUID().toString());
        data.put("content", message);
        data.put("role", "assistant");
        
        List<Map<String, Object>> citations = new ArrayList<>();
        Map<String, Object> cite = new HashMap<>();
        cite.put("title", "Spring Boot Documentation");
        cite.put("url", "https://spring.io/projects/spring-boot");
        cite.put("credibilityScore", 95);
        citations.add(cite);
        data.put("citations", citations);

        return ResponseEntity.ok(ApiResponse.success(data, "Chat response generated successfully"));
    }

    @PostMapping("/feedback")
    public ResponseEntity<ApiResponse<Map<String, Object>>> feedback(@RequestBody Map<String, Object> request) {
        Map<String, Object> data = new HashMap<>();
        data.put("status", "SUCCESS");
        return ResponseEntity.ok(ApiResponse.success(data, "Feedback received successfully"));
    }

    @PostMapping("/regenerate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> regenerate(@RequestBody Map<String, Object> request) {
        return chat(request);
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHistory() {
        List<Map<String, Object>> history = new ArrayList<>();
        
        Map<String, Object> session = new HashMap<>();
        session.put("id", "sess-1");
        session.put("title", "Java 21 Virtual Threads");
        session.put("lastMessage", "Virtual threads scale performance by running on carrier threads.");
        session.put("timestamp", "2026-07-16T10:00:00Z");
        history.add(session);

        return ResponseEntity.ok(ApiResponse.success(history, "History fetched successfully"));
    }
}
