package com.techpulse.agent;

import com.techpulse.agent.dto.AIRequest;
import com.techpulse.agent.dto.AIResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test validating AIClient provider switching capabilities.
 */
public class ProviderSwitchTest {

    @Test
    public void testSwitchingProviderInterface() {
        AIClient openaiMock = mock(AIClient.class);
        when(openaiMock.generate(any())).thenReturn(
                AIResponse.builder().content("OpenAI content").provider("OpenAI").build()
        );

        AIClient geminiMock = mock(AIClient.class);
        when(geminiMock.generate(any())).thenReturn(
                AIResponse.builder().content("Gemini content").provider("Gemini").build()
        );

        AIResponse resp1 = openaiMock.generate(AIRequest.builder().build());
        assertEquals("OpenAI", resp1.getProvider());

        AIResponse resp2 = geminiMock.generate(AIRequest.builder().build());
        assertEquals("Gemini", resp2.getProvider());
    }
}
