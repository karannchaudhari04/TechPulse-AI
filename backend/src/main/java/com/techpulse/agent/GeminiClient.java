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
import java.net.SocketTimeoutException;
import java.util.*;

/**
 * Gemini AI Client implementation. Communicates with Google's OpenAI compatible endpoints
 * and applies exponential backoff retry policies for 429/503 status codes.
 */
@Service
public class GeminiClient implements AIClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private final String apiKey;
    private final String baseUrl;
    private final String defaultModel;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GeminiClient(
            @Value("${spring.ai.openai.api-key:}") String apiKey,
            @Value("${spring.ai.openai.base-url:https://generativelanguage.googleapis.com/v1beta/openai/}") String baseUrl,
            @Value("${app.gemini.model:gemini-1.5-flash}") String defaultModel) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        this.defaultModel = defaultModel;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    @CircuitBreaker(name = "geminiClient", fallbackMethod = "generateFallback")
    @Bulkhead(name = "geminiClient")
    public AIResponse generate(AIRequest request) {
        String model = request.getModel() != null ? request.getModel() : defaultModel;
        String url = baseUrl + "chat/completions";

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", model);
        requestBody.put("temperature", request.getTemperature());
        if (request.getMaxTokens() > 0) {
            requestBody.put("max_tokens", request.getMaxTokens());
        }

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

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        int maxAttempts = 3;
        int delay = 1000;
        Exception lastException = null;

        long startTime = System.currentTimeMillis();

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                log.info("[GeminiClient] Sending request (requestId={}) to model {} (attempt {}/{})...",
                        request.getRequestId(), model, attempt, maxAttempts);

                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
                long latency = System.currentTimeMillis() - startTime;

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode choices = root.path("choices");
                    if (choices.isArray() && !choices.isEmpty()) {
                        JsonNode choice = choices.get(0);
                        String content = choice.path("message").path("content").asText();
                        String finishReason = choice.path("finish_reason").asText();

                        JsonNode usage = root.path("usage");
                        int promptTokens = usage.path("prompt_tokens").asInt(0);
                        int completionTokens = usage.path("completion_tokens").asInt(0);

                        return AIResponse.builder()
                                .content(content)
                                .model(model)
                                .promptTokens(promptTokens)
                                .completionTokens(completionTokens)
                                .finishReason(finishReason)
                                .latency(latency)
                                .provider("Gemini")
                                .rawResponse(response.getBody())
                                .build();
                    }
                }
                throw new IllegalStateException("Empty choices array in API response.");

            } catch (HttpClientErrorException ex) {
                lastException = ex;
                if (ex.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                    log.warn("[GeminiClient] Rate limit hit (429). Retrying in {}ms...", delay);
                } else {
                    log.error("[GeminiClient] Invalidation client error: {}", ex.getResponseBodyAsString());
                    throw ex;
                }
            } catch (HttpServerErrorException ex) {
                lastException = ex;
                if (ex.getStatusCode() == HttpStatus.SERVICE_UNAVAILABLE) {
                    log.warn("[GeminiClient] Service unavailable (503). Retrying in {}ms...", delay);
                } else {
                    throw ex;
                }
            } catch (ResourceAccessException ex) {
                lastException = ex;
                if (ex.getCause() instanceof SocketTimeoutException) {
                    log.warn("[GeminiClient] Socket timeout. Retrying in {}ms...", delay);
                } else {
                    throw ex;
                }
            } catch (Exception ex) {
                lastException = ex;
                throw new RuntimeException(ex);
            }

            if (attempt < maxAttempts) {
                try {
                    Thread.sleep(delay);
                    delay *= 2;
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(ie);
                }
            }
        }

        throw new RuntimeException("Gemini execution failed after " + maxAttempts + " attempts. Last exception: " + 
                (lastException != null ? lastException.getMessage() : "Unknown"));
    }

    public AIResponse generateFallback(AIRequest request, Throwable t) {
        log.error("[GeminiClient] Fallback triggered. Circuit open or limit reached: {}", t.getMessage());
        throw new RuntimeException("AI Synthesis Service temporarily unavailable due to resilience safety breaker.", t);
    }
}
