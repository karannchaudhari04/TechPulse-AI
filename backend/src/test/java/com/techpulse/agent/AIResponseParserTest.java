package com.techpulse.agent;

import com.techpulse.agent.dto.SynthesizedTechnologyEventDTO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test validating AIResponseParser strict JSON parsing and schema validation.
 */
public class AIResponseParserTest {

    @Test
    public void testStrictParsingAndValidation() {
        AIResponseParser parser = new AIResponseParser();

        String validJson = "{\n" +
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

        SynthesizedTechnologyEventDTO dto = parser.parse(validJson);
        assertNotNull(dto);
        assertEquals("Spring Boot v3.2.0 GA Stable Release", dto.getHeadline());
    }

    @Test
    public void testMissingFieldRejection() {
        AIResponseParser parser = new AIResponseParser();
        String invalidJson = "{\"headline\": \"Missing summary field\"}";

        assertThrows(RuntimeException.class, () -> parser.parse(invalidJson));
    }
}
