package com.techpulse.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.dto.SynthesizedTechnologyEventDTO;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Service providing strict JSON parsing and validation check for AI generated responses.
 */
@Service
public class AIResponseParser {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Parses json content and executes schema field validations.
     */
    public SynthesizedTechnologyEventDTO parse(String jsonContent) {
        if (jsonContent == null || jsonContent.trim().isEmpty()) {
            throw new IllegalArgumentException("Empty response content received.");
        }

        String cleaned = jsonContent.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```[a-zA-Z]*\\s*", "");
            cleaned = cleaned.replaceAll("\\s*```$", "");
        }
        cleaned = cleaned.trim();

        try {
            JsonNode root = objectMapper.readTree(cleaned);

            validateField(root, "headline");
            validateField(root, "summary");
            validateField(root, "technicalImpact");
            validateField(root, "developerImpact");
            validateField(root, "enterpriseImpact");
            validateField(root, "migrationNotes");
            validateField(root, "breakingChanges");
            validateField(root, "securityNotes");
            validateField(root, "confidenceExplanation");

            validateArrayField(root, "officialLinks");
            validateArrayField(root, "keyTakeaways");
            validateArrayField(root, "recommendedActions");

            List<String> officialLinks = new ArrayList<>();
            for (JsonNode node : root.path("officialLinks")) {
                officialLinks.add(node.asText());
            }

            List<String> keyTakeaways = new ArrayList<>();
            for (JsonNode node : root.path("keyTakeaways")) {
                keyTakeaways.add(node.asText());
            }

            List<String> recommendedActions = new ArrayList<>();
            for (JsonNode node : root.path("recommendedActions")) {
                recommendedActions.add(node.asText());
            }

            return SynthesizedTechnologyEventDTO.builder()
                    .headline(root.path("headline").asText())
                    .summary(root.path("summary").asText())
                    .technicalImpact(root.path("technicalImpact").asText())
                    .developerImpact(root.path("developerImpact").asText())
                    .enterpriseImpact(root.path("enterpriseImpact").asText())
                    .migrationNotes(root.path("migrationNotes").asText())
                    .breakingChanges(root.path("breakingChanges").asText())
                    .securityNotes(root.path("securityNotes").asText())
                    .officialLinks(officialLinks)
                    .keyTakeaways(keyTakeaways)
                    .recommendedActions(recommendedActions)
                    .confidenceExplanation(root.path("confidenceExplanation").asText())
                    .generatedAt(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Strict JSON response validation failed: " + e.getMessage(), e);
        }
    }

    private void validateField(JsonNode root, String fieldName) {
        if (!root.has(fieldName) || root.path(fieldName).isNull() || root.path(fieldName).asText().trim().isEmpty()) {
            throw new IllegalStateException("Missing or empty required field: " + fieldName);
        }
    }

    private void validateArrayField(JsonNode root, String fieldName) {
        if (!root.has(fieldName) || !root.path(fieldName).isArray()) {
            throw new IllegalStateException("Field is missing or is not a valid JSON array: " + fieldName);
        }
    }
}
