package com.techpulse.agent;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test validating GeminiClient initialization details.
 */
public class GeminiClientTest {

    @Test
    public void testClientInstantiation() {
        GeminiClient client = new GeminiClient("key", "http://test-url", "gemini-1.5-flash");
        assertNotNull(client);
    }
}
