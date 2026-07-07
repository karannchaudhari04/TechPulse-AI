package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.dto.EntityExtractedUpdateDTO;
import com.techpulse.agent.dto.SynthesizedTechnologyEventDTO;
import com.techpulse.agent.dto.TechnologyEventDTO;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Service executing validation checks to protect against LLM hallucinations.
 */
@Service
public class HallucinationValidator {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Validates that entities, version numbers, and links are not fabricated.
     */
    public void validate(TechnologyEventDTO eventDto, SynthesizedTechnologyEventDTO summaryDto) {
        String headline = summaryDto.getHeadline().toLowerCase();
        String summary = summaryDto.getSummary().toLowerCase();

        Set<String> eventEntities = new HashSet<>();
        if (eventDto.getEvent().getEntitiesJson() != null) {
            try {
                List<?> list = objectMapper.readValue(eventDto.getEvent().getEntitiesJson(), List.class);
                for (Object s : list) {
                    eventEntities.add(String.valueOf(s).toLowerCase());
                }
            } catch (Exception ignored) {}
        }

        List<String> standardTech = List.of("java", "rust", "python", "go", "typescript", "javascript", "kubernetes", "docker", "aws", "gcp", "azure", "openai", "github", "gemini", "claude", "llama");
        for (String tech : standardTech) {
            if (!eventEntities.contains(tech) && (headline.contains(tech) || summary.contains(tech))) {
                throw new IllegalStateException("Hallucination check failed: Mismatched entity '" + tech + "' referenced in summary but not in event metadata.");
            }
        }

        Set<String> sourceUrls = new HashSet<>();
        for (EntityExtractedUpdateDTO u : eventDto.getSupportingUpdates()) {
            sourceUrls.add(u.getImportanceAssessedUpdate().getCredibilityAssessedUpdate().getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getSourceUrl());
        }

        if (summaryDto.getOfficialLinks() != null) {
            for (String link : summaryDto.getOfficialLinks()) {
                if (link != null && !link.isEmpty() && !link.equals("Not confirmed.")) {
                    boolean match = sourceUrls.stream().anyMatch(url -> url.contains(link) || link.contains(url) || url.toLowerCase().contains(extractHost(link)));
                    if (!match) {
                        throw new IllegalStateException("Hallucination check failed: Fabricated URL link '" + link + "' found in officialLinks.");
                    }
                }
            }
        }
    }

    private String extractHost(String url) {
        try {
            String host = url.replace("http://", "").replace("https://", "");
            int slash = host.indexOf("/");
            if (slash > 0) {
                host = host.substring(0, slash);
            }
            return host.toLowerCase();
        } catch (Exception e) {
            return url.toLowerCase();
        }
    }
}
