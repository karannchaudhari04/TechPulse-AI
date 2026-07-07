package com.techpulse.agent;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test validating AIResponseParser schema validation rules.
 */
public class SchemaValidationTest {

    @Test
    public void testStrictValidationOfResponseFields() {
        AIResponseParser parser = new AIResponseParser();
        String invalidJson = "{\n" +
                "  \"summary\": \"Some summary.\"\n" +
                "}";

        assertThrows(RuntimeException.class, () -> parser.parse(invalidJson));
    }
}
