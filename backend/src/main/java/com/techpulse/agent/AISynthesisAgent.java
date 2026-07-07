package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.dto.*;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.TechnologyEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Agent orchestrating LLM synthesis, strictly validating outputs, managing caching,
 * and maintaining TechnologyEvent DB states.
 */
@Service
public class AISynthesisAgent implements Agent<TechnologyEventDTO, SynthesizedTechnologyEventDTO> {

    private static final Logger log = LoggerFactory.getLogger(AISynthesisAgent.class);

    private final AIClient aiClient;
    private final PromptTemplateService promptTemplateService;
    private final PromptContextFactory promptContextFactory;
    private final PromptRenderer promptRenderer;
    private final AIResponseParser aiResponseParser;
    private final HallucinationValidator hallucinationValidator;
    private final SummaryCache summaryCache;
    private final AIMetricsCollector metricsCollector;
    private final TechnologyEventRepository technologyEventRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.gemini.model:gemini-1.5-flash}")
    private String modelName;

    @Value("${app.gemini.temperature:0.2}")
    private double temperature;

    @Value("${app.gemini.max-tokens:2048}")
    private int maxTokens;

    @Value("${app.gemini.prompt-version:PROMPT_V1}")
    private String promptVersion;

    public AISynthesisAgent(AIClient aiClient,
                            PromptTemplateService promptTemplateService,
                            PromptContextFactory promptContextFactory,
                            PromptRenderer promptRenderer,
                            AIResponseParser aiResponseParser,
                            HallucinationValidator hallucinationValidator,
                            SummaryCache summaryCache,
                            AIMetricsCollector metricsCollector,
                            TechnologyEventRepository technologyEventRepository) {
        this.aiClient = aiClient;
        this.promptTemplateService = promptTemplateService;
        this.promptContextFactory = promptContextFactory;
        this.promptRenderer = promptRenderer;
        this.aiResponseParser = aiResponseParser;
        this.hallucinationValidator = hallucinationValidator;
        this.summaryCache = summaryCache;
        this.metricsCollector = metricsCollector;
        this.technologyEventRepository = technologyEventRepository;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public SynthesizedTechnologyEventDTO process(TechnologyEventDTO input) {
        TechnologyEvent event = input.getEvent();

        String eventId = event.getId();
        String kgHash = getMd5Hash(event.getEntitiesJson());
        String timelineHash = getMd5Hash(event.getVersionString() + ":" + event.getLifecycleStatus());
        String entitiesHash = getMd5Hash(event.getEntitiesJson());
        String systemPrompt = promptTemplateService.getTemplate(promptVersion);
        String sysPromptHash = getMd5Hash(systemPrompt);

        String cacheKey = summaryCache.generateKey(eventId, kgHash, timelineHash, entitiesHash,
                promptVersion, modelName, temperature, maxTokens, sysPromptHash);

        SynthesizedTechnologyEventDTO cached = summaryCache.get(cacheKey);
        if (cached != null) {
            log.info("[AISynthesisAgent] Cache hit for eventId={}! Reusing summary.", eventId);
            metricsCollector.recordCacheHit();
            return cached;
        }

        log.info("[AISynthesisAgent] Cache miss for eventId={}. Building prompt and invoking AIClient...", eventId);

        event.setSummaryStatus("GENERATING");
        technologyEventRepository.save(event);

        long startTime = System.currentTimeMillis();
        String requestId = UUID.randomUUID().toString();

        PromptContext context = promptContextFactory.createContext(event);
        String userPrompt = promptRenderer.render(systemPrompt, context);

        AIRequest request = AIRequest.builder()
                .model(modelName)
                .temperature(temperature)
                .maxTokens(maxTokens)
                .systemPrompt("")
                .userPrompt(userPrompt)
                .responseSchema("JSON")
                .requestId(requestId)
                .build();

        AIResponse response;
        try {
            response = aiClient.generate(request);
        } catch (Exception e) {
            log.error("[AISynthesisAgent] Provider invocation failed for eventId={}: {}", eventId, e.getMessage());
            event.setSummaryStatus("FAILED");
            technologyEventRepository.save(event);
            metricsCollector.recordProviderError();
            throw new RuntimeException("AI provider error: " + e.getMessage(), e);
        }

        long latency = System.currentTimeMillis() - startTime;

        SynthesizedTechnologyEventDTO synthesized;
        try {
            synthesized = aiResponseParser.parse(response.getContent());
        } catch (Exception e) {
            log.error("[AISynthesisAgent] JSON validation failed for eventId={}: {}", eventId, e.getMessage());
            event.setSummaryStatus("FAILED");
            technologyEventRepository.save(event);
            metricsCollector.recordValidationFailure();
            throw new RuntimeException("AI output validation error: " + e.getMessage(), e);
        }

        try {
            hallucinationValidator.validate(input, synthesized);
        } catch (Exception e) {
            log.error("[AISynthesisAgent] Hallucination check failed for eventId={}: {}", eventId, e.getMessage());
            event.setSummaryStatus("FAILED");
            technologyEventRepository.save(event);
            metricsCollector.recordHallucinationFailure();
            throw new RuntimeException("AI output validation error (Hallucination): " + e.getMessage(), e);
        }

        double costUsd = response.getPromptTokens() * 0.000000075 + response.getCompletionTokens() * 0.0000003;
        double costInr = costUsd * 83.50;

        event.setSummary(synthesized.getSummary());
        event.setTechnicalImpact(synthesized.getTechnicalImpact());
        event.setDeveloperImpact(synthesized.getDeveloperImpact());
        event.setEnterpriseImpact(synthesized.getEnterpriseImpact());
        event.setMigrationNotes(synthesized.getMigrationNotes());
        event.setBreakingChanges(synthesized.getBreakingChanges());
        event.setSecurityNotes(synthesized.getSecurityNotes());
        try {
            event.setOfficialLinksJson(objectMapper.writeValueAsString(synthesized.getOfficialLinks()));
        } catch (Exception ignored) {}
        event.setLlmModel(modelName);
        event.setPromptVersion(promptVersion);
        event.setResponseSchemaVersion("v1");
        event.setSummaryStatus("READY");
        event.setPromptTokens(response.getPromptTokens());
        event.setCompletionTokens(response.getCompletionTokens());
        event.setEstimatedCostUsd(costUsd);
        event.setEstimatedCostInr(costInr);
        event.setGenerationLatency((int) latency);
        event.setSummaryGeneratedAt(LocalDateTime.now());

        technologyEventRepository.save(event);

        SynthesizedTechnologyEventDTO result = SynthesizedTechnologyEventDTO.builder()
                .headline(synthesized.getHeadline())
                .summary(synthesized.getSummary())
                .technicalImpact(synthesized.getTechnicalImpact())
                .developerImpact(synthesized.getDeveloperImpact())
                .enterpriseImpact(synthesized.getEnterpriseImpact())
                .migrationNotes(synthesized.getMigrationNotes())
                .breakingChanges(synthesized.getBreakingChanges())
                .securityNotes(synthesized.getSecurityNotes())
                .officialLinks(synthesized.getOfficialLinks())
                .keyTakeaways(synthesized.getKeyTakeaways())
                .recommendedActions(synthesized.getRecommendedActions())
                .confidenceExplanation(synthesized.getConfidenceExplanation())
                .generatedAt(event.getSummaryGeneratedAt())
                .promptVersion(promptVersion)
                .modelName(modelName)
                .promptTokens(response.getPromptTokens())
                .completionTokens(response.getCompletionTokens())
                .latency(latency)
                .estimatedCostUsd(costUsd)
                .estimatedCostInr(costInr)
                .status("READY")
                .build();

        summaryCache.put(cacheKey, result);
        metricsCollector.recordRequest(response.getPromptTokens(), response.getCompletionTokens(), latency, costUsd, synthesized.getSummary().length());

        return result;
    }

    public SynthesizedTechnologyEventDTO generateWithoutPersistence(TechnologyEventDTO input) {
        String systemPrompt = promptTemplateService.getTemplate(promptVersion);
        PromptContext context = promptContextFactory.createContext(input.getEvent());
        String userPrompt = promptRenderer.render(systemPrompt, context);

        AIRequest request = AIRequest.builder()
                .model(modelName)
                .temperature(temperature)
                .maxTokens(maxTokens)
                .systemPrompt("")
                .userPrompt(userPrompt)
                .responseSchema("JSON")
                .requestId(UUID.randomUUID().toString())
                .build();

        AIResponse response = aiClient.generate(request);
        SynthesizedTechnologyEventDTO synthesized = aiResponseParser.parse(response.getContent());
        hallucinationValidator.validate(input, synthesized);
        return synthesized;
    }

    private String getMd5Hash(String text) {
        if (text == null) return "";
        try {
            MessageDigest digest = MessageDigest.getInstance("MD5");
            byte[] bytes = digest.digest(text.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(text.hashCode());
        }
    }
}
