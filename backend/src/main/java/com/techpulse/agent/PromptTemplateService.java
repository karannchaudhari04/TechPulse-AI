package com.techpulse.agent;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Service centralizing the prompt template repository and versioning strategies.
 */
@Service
public class PromptTemplateService {

    public static final String PROMPT_V1 = "You are a professional technology analyst. Synthesize the provided technology event context into a high-quality human-readable intelligence report.\n" +
            "\n" +
            "Rules:\n" +
            "- REMOVE duplicates\n" +
            "- MERGE conflicting wording\n" +
            "- PRESERVE facts only. Do NOT invent version numbers, release dates, or vulnerability CVEs not specified in the input.\n" +
            "- Avoid speculation or marketing/hype terminology. Produce a neutral, objective, and developer-oriented tone.\n" +
            "- If evidence is not explicitly available in the context, output \"Not confirmed.\" for that field.\n" +
            "\n" +
            "Input details:\n" +
            "EVENT:\n" +
            "Title: {{title}}\n" +
            "Version: {{version}}\n" +
            "Categories: {{categories}}\n" +
            "Credibility Score: {{credibilityScore}}\n" +
            "Importance Score: {{importanceScore}}\n" +
            "Timeline milestones: {{timeline}}\n" +
            "Knowledge Graph references: {{graph}}\n" +
            "Trend Level: {{trend}}\n" +
            "Entities: {{entities}}\n" +
            "\n" +
            "Return STRICT JSON ONLY. Do not wrap in markdown or code blocks. JSON structure:\n" +
            "{\n" +
            "  \"headline\": \"concise release headline\",\n" +
            "  \"summary\": \"concise paragraphs detailing the core update\",\n" +
            "  \"technicalImpact\": \"impact on architecture, stack, performance\",\n" +
            "  \"developerImpact\": \"impact on dev workflows, code changes\",\n" +
            "  \"enterpriseImpact\": \"impact on operations, licensing, infrastructure\",\n" +
            "  \"migrationNotes\": \"notes on migration pathways\",\n" +
            "  \"breakingChanges\": \"list of breaking changes or Not confirmed.\",\n" +
            "  \"securityNotes\": \"security fixes, CVE list or Not confirmed.\",\n" +
            "  \"officialLinks\": [\"list\", \"of\", \"parsed\", \"URLs\"],\n" +
            "  \"keyTakeaways\": [\"takeaway 1\", \"takeaway 2\"],\n" +
            "  \"recommendedActions\": [\"action 1\", \"action 2\"],\n" +
            "  \"confidenceExplanation\": \"explanation of validation certainty\"\n" +
            "}";

    public static final String PROMPT_V2 = "Detailed prompt with extra guidelines for strict structure.\n" + PROMPT_V1;

    public static final String PROMPT_DEBUG = "Minimal prompt for debug.\n" +
            "Event title: {{title}}. Return JSON.";

    private final Map<String, String> templates = new HashMap<>();

    public PromptTemplateService() {
        templates.put("PROMPT_V1", PROMPT_V1);
        templates.put("PROMPT_V2", PROMPT_V2);
        templates.put("PROMPT_DEBUG", PROMPT_DEBUG);
    }

    public String getTemplate(String version) {
        return templates.getOrDefault(version, PROMPT_V1);
    }
}
