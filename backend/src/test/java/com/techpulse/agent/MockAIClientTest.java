package com.techpulse.agent;

import com.techpulse.agent.dto.AIRequest;
import com.techpulse.agent.dto.AIResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test validating MockAIClient response generation behavior.
 */
public class MockAIClientTest {

    @Test
    public void testMockAIClientResponse() {
        MockAIClient client = new MockAIClient();
        AIRequest request = AIRequest.builder().model("mock-model").build();
        AIResponse response = client.generate(request);

        assertNotNull(response);
        assertEquals("MockAI", response.getProvider());
        assertTrue(response.getContent().contains("Spring Boot"));
    }
}
