package com.techpulse.agent;

import com.techpulse.agent.dto.AIRequest;
import com.techpulse.agent.dto.AIResponse;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * Mock AI Client implementation for isolated unit and integration testing.
 */
@Service
@Profile("test")
@Primary
public class MockAIClient implements AIClient {

    private String nextResponseContent = "{\n" +
            "  \"headline\": \"Spring Boot v3.2.0 GA Stable Release\",\n" +
            "  \"summary\": \"This is a high quality summary detailing the core update of Spring Boot v3.2.0 GA.\",\n" +
            "  \"technicalImpact\": \"Significant performance optimization and memory efficiency improvements.\",\n" +
            "  \"developerImpact\": \"Workflow acceleration and enhanced migration tooling support.\",\n" +
            "  \"enterpriseImpact\": \"Enhanced telemetry support and lower infrastructure overhead cost.\",\n" +
            "  \"migrationNotes\": \"Clean migration pathway via gradle/maven plugins.\",\n" +
            "  \"breakingChanges\": \"Deprecated direct serialization mechanisms.\",\n" +
            "  \"securityNotes\": \"Addressed minor CVE CVE-2026-1234.\",\n" +
            "  \"officialLinks\": [\"http://foo.com/sb\"],\n" +
            "  \"keyTakeaways\": [\"GA release stable\", \"Java 21 supported\"],\n" +
            "  \"recommendedActions\": [\"Upgrade immediately\"],\n" +
            "  \"confidenceExplanation\": \"Fully verified release metrics.\"\n" +
            "}";

    private int promptTokens = 150;
    private int completionTokens = 300;
    private String finishReason = "stop";
    private long latency = 500;
    private String provider = "MockAI";

    @Override
    public AIResponse generate(AIRequest request) {
        return AIResponse.builder()
                .content(nextResponseContent)
                .model(request.getModel())
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .finishReason(finishReason)
                .latency(latency)
                .provider(provider)
                .rawResponse(nextResponseContent)
                .build();
    }

    public void setNextResponseContent(String content) {
        this.nextResponseContent = content;
    }
}
