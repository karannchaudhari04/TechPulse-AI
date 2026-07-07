package com.techpulse.agent;

import com.techpulse.agent.dto.PromptContext;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test validating PromptRenderer placeholder substitutions.
 */
public class PromptRendererTest {

    @Test
    public void testRenderTemplate() {
        PromptRenderer renderer = new PromptRenderer();
        String template = "Title: {{title}}, Version: {{version}}";
        PromptContext context = PromptContext.builder()
                .title("Spring Boot")
                .version("v3.2.0")
                .build();

        String result = renderer.render(template, context);
        assertEquals("Title: Spring Boot, Version: v3.2.0", result);
    }
}
