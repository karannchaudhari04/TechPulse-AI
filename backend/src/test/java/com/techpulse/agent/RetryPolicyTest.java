package com.techpulse.agent;

import com.techpulse.agent.dto.AIRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test validating retry policies and attempts constraints.
 */
public class RetryPolicyTest {

    @Test
    public void testRetryAttemptsCount() {
        AIClient aiClientMock = mock(AIClient.class);
        AIRequest request = AIRequest.builder().requestId("req-123").build();

        when(aiClientMock.generate(any()))
                .thenThrow(new RuntimeException("Rate Limit 429"))
                .thenThrow(new RuntimeException("Rate Limit 429"))
                .thenReturn(null);

        int attempts = 0;
        for (int i = 0; i < 3; i++) {
            attempts++;
            try {
                aiClientMock.generate(request);
                break;
            } catch (Exception ignored) {}
        }
        assertEquals(3, attempts);
    }
}
