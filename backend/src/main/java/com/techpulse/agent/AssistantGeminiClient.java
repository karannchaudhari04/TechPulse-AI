package com.techpulse.agent;

import com.techpulse.agent.dto.AIRequest;
import com.techpulse.agent.dto.AIResponse;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Gemini client for user-facing assistant chat, kept separate from update summarization. */
@Service
public class AssistantGeminiClient {

    private final GeminiClient delegate;

    public AssistantGeminiClient(
            @Value("${spring.ai.openai.explain-api-key:}") String apiKey,
            @Value("${spring.ai.openai.base-url:https://generativelanguage.googleapis.com/v1beta/openai/}") String baseUrl,
            @Value("${app.gemini.model:gemini-3.5-flash-lite}") String defaultModel,
            @Value("${app.gemini.fallback-models:gemini-3.8-flash,gemini-3.6-flash}") String fallbackModels) {
        this.delegate = new GeminiClient(apiKey, baseUrl, defaultModel, fallbackModels);
    }

    @CircuitBreaker(name = "geminiAssistant", fallbackMethod = "generateFallback")
    @Bulkhead(name = "geminiAssistant")
    public AIResponse generate(AIRequest request) {
        return delegate.generate(request);
    }

    public AIResponse generateFallback(AIRequest request, Throwable cause) {
        throw new RuntimeException("Assistant service is temporarily unavailable.", cause);
    }
}
