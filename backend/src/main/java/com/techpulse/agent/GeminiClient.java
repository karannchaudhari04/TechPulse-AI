package com.techpulse.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.dto.AIRequest;
import com.techpulse.agent.dto.AIResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.*;
import java.time.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gemini AI Client implementation. Communicates with Google's OpenAI compatible endpoints
 * and falls through a configured model chain for quota and transient provider failures.
 */
@Service
public class GeminiClient implements AIClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private final String apiKey;
    private final String baseUrl;
    private final String defaultModel;
    private final List<String> fallbackModels;
    private final Map<String, Instant> modelUnavailableUntil = new ConcurrentHashMap<>();
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GeminiClient(
            @Value("${spring.ai.openai.api-key:}") String apiKey,
            @Value("${spring.ai.openai.base-url:https://generativelanguage.googleapis.com/v1beta/openai/}") String baseUrl,
            @Value("${app.gemini.model:gemini-3.5-flash-lite}") String defaultModel,
            @Value("${app.gemini.fallback-models:gemini-3.8-flash,gemini-3.6-flash}") String fallbackModels) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        this.defaultModel = defaultModel;
        this.fallbackModels = Arrays.stream(fallbackModels.split(","))
                .map(String::trim).filter(model -> !model.isEmpty()).toList();
        org.springframework.http.client.SimpleClientHttpRequestFactory requestFactory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10_000);
        requestFactory.setReadTimeout(45_000);
        this.restTemplate = new RestTemplate(requestFactory);
        this.objectMapper = new ObjectMapper();
    }

    @Override
    @CircuitBreaker(name = "geminiClient", fallbackMethod = "generateFallback")
    @Bulkhead(name = "geminiClient")
    public AIResponse generate(AIRequest request) {
        String url = baseUrl + "chat/completions";
        String primaryModel = request.getModel() != null ? request.getModel() : defaultModel;
        List<String> models = new ArrayList<>();
        models.add(primaryModel);
        for (String fallbackModel : fallbackModels) {
            if (!models.contains(fallbackModel)) models.add(fallbackModel);
        }
        Exception lastException = null;
        for (String model : models) {
            Instant unavailableUntil = modelUnavailableUntil.get(model);
            if (unavailableUntil != null && Instant.now().isBefore(unavailableUntil)) {
                log.info("[GeminiClient] Skipping model {} while its quota cooldown is active until {}.", model, unavailableUntil);
                continue;
            }
            try {
                return generateWithModel(request, url, model);
            } catch (HttpClientErrorException ex) {
                if (ex.getStatusCode() != HttpStatus.TOO_MANY_REQUESTS
                        && ex.getStatusCode() != HttpStatus.NOT_FOUND) throw ex;
                lastException = ex;
                if (ex.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                    Instant cooldownUntil = getQuotaCooldownUntil(ex);
                    modelUnavailableUntil.put(model, cooldownUntil);
                    log.warn("[GeminiClient] Model {} throttled; cooling it down until {} before continuing the model chain.",
                            model, cooldownUntil);
                }
                log.warn("[GeminiClient] Model {} returned {}; trying next configured model.", model, ex.getStatusCode());
            } catch (HttpServerErrorException ex) {
                if (!ex.getStatusCode().is5xxServerError()) throw ex;
                lastException = ex;
                log.warn("[GeminiClient] Model {} returned {}; trying next configured model.", model, ex.getStatusCode());
            } catch (ResourceAccessException ex) {
                lastException = ex;
                log.warn("[GeminiClient] Model {} transport failure ({}); trying next configured model.",
                        model, ex.getMessage());
            }
        }
        throw new RuntimeException("Gemini fallback chain exhausted after trying " + models.size()
                + " configured models. Last error: " + (lastException == null ? "unknown" : lastException.getMessage()), lastException);
    }

    private Instant getQuotaCooldownUntil(HttpClientErrorException exception) {
        String responseBody = exception.getResponseBodyAsString().toLowerCase(Locale.ROOT);
        if (responseBody.contains("requestsperday") || responseBody.contains("perdayperproject")
                || responseBody.contains("requests_per_day")) {
            ZoneId pacific = ZoneId.of("America/Los_Angeles");
            return LocalDate.now(pacific).plusDays(1).atStartOfDay(pacific).toInstant();
        }
        String retryAfter = exception.getResponseHeaders() == null
                ? null : exception.getResponseHeaders().getFirst(HttpHeaders.RETRY_AFTER);
        try {
            long retrySeconds = retryAfter == null ? 60 : Long.parseLong(retryAfter.trim());
            return Instant.now().plusSeconds(Math.max(1, retrySeconds));
        } catch (NumberFormatException ignored) {
            return Instant.now().plusSeconds(60);
        }
    }

    private AIResponse generateWithModel(AIRequest request, String url, String model) {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", model);
        requestBody.put("temperature", request.getTemperature());
        if (request.getMaxTokens() > 0) requestBody.put("max_tokens", request.getMaxTokens());

        List<Map<String, String>> messages = new ArrayList<>();
        if (request.getSystemPrompt() != null && !request.getSystemPrompt().isEmpty()) {
            messages.add(Map.of("role", "system", "content", request.getSystemPrompt()));
        }
        messages.add(Map.of("role", "user", "content", request.getUserPrompt()));
        requestBody.put("messages", messages);
        requestBody.put("response_format", Map.of("type", "json_object"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);
        long startTime = System.currentTimeMillis();
        log.info("[GeminiClient] Sending request (requestId={}) to model {}.", request.getRequestId(), model);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST,
                new HttpEntity<>(requestBody, headers), String.class);
        if (response.getBody() == null) throw new IllegalStateException("Empty response body from Gemini API.");
        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) throw new IllegalStateException("Empty choices array in API response.");
            JsonNode choice = choices.get(0);
            JsonNode usage = root.path("usage");
            return AIResponse.builder()
                    .content(choice.path("message").path("content").asText())
                    .model(model)
                    .promptTokens(usage.path("prompt_tokens").asInt(0))
                    .completionTokens(usage.path("completion_tokens").asInt(0))
                    .finishReason(choice.path("finish_reason").asText())
                    .latency(System.currentTimeMillis() - startTime)
                    .provider("Gemini")
                    .rawResponse(response.getBody())
                    .build();
        } catch (HttpClientErrorException | HttpServerErrorException | ResourceAccessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("Could not parse Gemini response", ex);
        }
    }

    public AIResponse generateFallback(AIRequest request, Throwable t) {
        log.error("[GeminiClient] Fallback triggered. Circuit open or limit reached: {}", t.getMessage());
        throw new RuntimeException("AI Synthesis Service temporarily unavailable due to resilience safety breaker.", t);
    }
}
