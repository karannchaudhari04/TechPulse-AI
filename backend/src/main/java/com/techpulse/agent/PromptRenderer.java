package com.techpulse.agent;

import com.techpulse.agent.dto.PromptContext;
import org.springframework.stereotype.Service;

/**
 * Service merging PromptContext values into targeted prompt templates.
 */
@Service
public class PromptRenderer {

    /**
     * Replaces double bracket tokens with context values.
     */
    public String render(String template, PromptContext context) {
        if (template == null) return "";
        return template
                .replace("{{title}}", context.getTitle() != null ? context.getTitle() : "")
                .replace("{{version}}", context.getVersion() != null ? context.getVersion() : "")
                .replace("{{categories}}", context.getCategories() != null ? context.getCategories() : "")
                .replace("{{credibilityScore}}", context.getCredibilityScore() != null ? context.getCredibilityScore() : "")
                .replace("{{importanceScore}}", context.getImportanceScore() != null ? context.getImportanceScore() : "")
                .replace("{{timeline}}", context.getTimeline() != null ? context.getTimeline() : "")
                .replace("{{graph}}", context.getGraph() != null ? context.getGraph() : "")
                .replace("{{trend}}", context.getTrend() != null ? context.getTrend() : "")
                .replace("{{entities}}", context.getEntities() != null ? context.getEntities() : "");
    }
}
