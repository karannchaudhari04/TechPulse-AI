package com.techpulse.agent;

import com.techpulse.agent.dto.AIRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
public class ResiliencePatternTest {

    @Autowired
    private GeminiClient geminiClient;

    @Test
    public void whenGeminiClientFails_shouldTriggerSafetyBreaker() {
        AIRequest request = AIRequest.builder()
                .userPrompt("Hello")
                .systemPrompt("Be helpful")
                .build();
        
        assertThrows(Exception.class, () -> {
            geminiClient.generate(request);
        });
    }
}
