package com.techpulse.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.AIClient;
import com.techpulse.agent.dto.AIRequest;
import com.techpulse.agent.dto.AIResponse;
import com.techpulse.ai.dto.StructuredEventResponseDTO;
import com.techpulse.model.Category;
import com.techpulse.model.RawIngestion;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.CategoryRepository;
import com.techpulse.repository.RawIngestionRepository;
import com.techpulse.repository.TechnologyEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class AISynthesisServiceImpl implements AISynthesisService {

    private static final Logger log = LoggerFactory.getLogger(AISynthesisServiceImpl.class);

    private static final List<String> KNOWN_CATEGORIES = List.of(
            "DSA & Problem Solving", "Web Development", "Mobile Development",
            "AI & Machine Learning", "Cloud & DevOps", "System Design & Backend",
            "Cybersecurity", "Data Science & Analytics", "Product & UI/UX",
            "Open Source & GitHub", "Career & Placements", "Emerging Tech"
    );

    private final AIClient aiClient;
    private final TechnologyEventRepository technologyEventRepository;
    private final CategoryRepository categoryRepository;
    private final RawIngestionRepository rawIngestionRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.gemini.model:gemini-1.5-flash}")
    private String modelName;

    public AISynthesisServiceImpl(AIClient aiClient,
                                 TechnologyEventRepository technologyEventRepository,
                                 CategoryRepository categoryRepository,
                                 RawIngestionRepository rawIngestionRepository) {
        this.aiClient = aiClient;
        this.technologyEventRepository = technologyEventRepository;
        this.categoryRepository = categoryRepository;
        this.rawIngestionRepository = rawIngestionRepository;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    @Transactional
    public TechnologyEvent synthesizeAndSave(RawIngestion rawUpdate) {
        log.info("[AISynthesisService] Processing raw update for AI synthesis: '{}' (Event ID: {})", 
                rawUpdate.getTitle(), rawUpdate.getEventId());

        String prompt = buildStructuredPrompt(rawUpdate.getTitle(), rawUpdate.getRawContent());

        AIRequest request = AIRequest.builder()
                .model(modelName)
                .temperature(0.2)
                .maxTokens(2048)
                .systemPrompt("You are a professional technology analyst. Return strict JSON ONLY.")
                .userPrompt(prompt)
                .responseSchema("JSON")
                .requestId(UUID.randomUUID().toString())
                .build();

        AIResponse response;
        try {
            response = aiClient.generate(request);
        } catch (Exception e) {
            log.error("[AISynthesisService] Failed to invoke Gemini for event ID '{}': {}", rawUpdate.getEventId(), e.getMessage());
            rawUpdate.setProcessingStatus(RawIngestion.ProcessingStatus.NEW); // retry later
            rawIngestionRepository.save(rawUpdate);
            throw new RuntimeException("Gemini generation failed: " + e.getMessage(), e);
        }

        String jsonContent = response.getContent().trim();
        if (jsonContent.startsWith("```")) {
            jsonContent = jsonContent.replaceAll("^```[a-zA-Z]*\\s*", "");
            jsonContent = jsonContent.replaceAll("\\s*```$", "");
        }
        jsonContent = jsonContent.trim();

        StructuredEventResponseDTO dto;
        try {
            dto = objectMapper.readValue(jsonContent, StructuredEventResponseDTO.class);
        } catch (Exception e) {
            log.error("[AISynthesisService] Failed to parse Gemini response JSON for event ID '{}': {}", rawUpdate.getEventId(), e.getMessage());
            rawUpdate.setProcessingStatus(RawIngestion.ProcessingStatus.NEW); // retry later
            rawIngestionRepository.save(rawUpdate);
            throw new RuntimeException("Structured output parsing failed", e);
        }

        // Validate Category
        String categoryName = dto.getCategory();
        if (categoryName == null || !KNOWN_CATEGORIES.contains(categoryName)) {
            categoryName = "Emerging Tech";
        }

        TechnologyEvent event = TechnologyEvent.builder()
                .id(rawUpdate.getEventId())
                .title(dto.getTitle() != null && !dto.getTitle().isBlank() ? dto.getTitle() : rawUpdate.getTitle())
                .summary(dto.getSummary())
                .technicalImpact(dto.getTechnicalImpact())
                .developerImpact(dto.getDeveloperImpact())
                .enterpriseImpact(dto.getEnterpriseImpact())
                .migrationNotes(dto.getMigrationNotes())
                .breakingChanges(dto.getBreakingChanges())
                .securityNotes(dto.getSecurityNotes())
                .credibilityScore(dto.getCredibilityScore() != null ? dto.getCredibilityScore() : 80.0)
                .importanceScore(dto.getImportanceScore() != null ? dto.getImportanceScore() : 70.0)
                .versionString(dto.getVersionString())
                .lifecycleStatus(dto.getLifecycleStatus())
                .firstSeen(rawUpdate.getPublishedAt() != null ? rawUpdate.getPublishedAt() : LocalDateTime.now())
                .lastUpdated(LocalDateTime.now())
                .summaryStatus("READY")
                .llmModel(modelName)
                .promptTokens(response.getPromptTokens())
                .completionTokens(response.getCompletionTokens())
                .generationLatency((int) response.getLatency())
                .summaryGeneratedAt(LocalDateTime.now())
                .build();

        try {
            event.setCategoriesJson(objectMapper.writeValueAsString(List.of(categoryName)));
            event.setEntitiesJson(objectMapper.writeValueAsString(dto.getTopics() != null ? dto.getTopics() : Collections.emptyList()));
            
            List<String> links = dto.getOfficialLinks() != null && !dto.getOfficialLinks().isEmpty() 
                    ? dto.getOfficialLinks() 
                    : List.of(rawUpdate.getUrl());
            event.setOfficialLinksJson(objectMapper.writeValueAsString(links));
        } catch (Exception e) {
            log.error("[AISynthesisService] Error serializing JSON list fields: {}", e.getMessage());
        }

        technologyEventRepository.save(event);

        // Mark raw ingestion as processed
        rawUpdate.setProcessingStatus(RawIngestion.ProcessingStatus.PROCESSED);
        rawIngestionRepository.save(rawUpdate);

        log.info("[AISynthesisService] Successfully synthesized and saved TechnologyEvent ID: {}", event.getId());
        return event;
    }

    private String buildStructuredPrompt(String title, String content) {
        String categoriesStr = String.join(", ", KNOWN_CATEGORIES);
        return """
                You are a senior technology analyst. Synthesize this raw technology update into a structured, developer-oriented news event.
                
                RAW TITLE: %s
                RAW CONTENT: %s
                
                Select exactly one category from these options:
                - %s
                
                Extract 3-5 specific topics/tags (e.g. "React", "LLM", "Docker").
                Evaluate overall importanceScore (0.0 to 100.0) and credibilityScore (0.0 to 100.0) based on source strength and technical impact.
                Extract versionString (e.g., "19.0.0" or null if not applicable) and lifecycleStatus (e.g., "RELEASED", "BETA", "GA", or null).
                For impacts (technicalImpact, developerImpact, enterpriseImpact), write 1-2 concise, high-value sentences explaining what developers and businesses need to know.
                Write migrationNotes, breakingChanges, and securityNotes if mentioned, otherwise write "Not confirmed."
                
                Return STRICT JSON matching the following schema. Wrap output in a JSON object only. Do not add markdown or backticks.
                {
                  "title": "string (non-clickbait, technically meaningful headline)",
                  "summary": "string (a bulleted or clear summary explaining what happened, what changed, and why it matters)",
                  "category": "string (must match one of the listed categories exactly)",
                  "topics": ["string"],
                  "importanceScore": number,
                  "credibilityScore": number,
                  "versionString": "string or null",
                  "lifecycleStatus": "string or null",
                  "technicalImpact": "string",
                  "developerImpact": "string",
                  "enterpriseImpact": "string",
                  "migrationNotes": "string",
                  "breakingChanges": "string",
                  "securityNotes": "string",
                  "officialLinks": ["string"]
                }
                """.formatted(title, content.substring(0, Math.min(content.length(), 3500)), categoriesStr);
    }
}
