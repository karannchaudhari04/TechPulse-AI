package com.techpulse.agent;

import com.techpulse.agent.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Agent responsible for extracting structured named entities from updates
 * and resolving aliases before event grouping downstream.
 */
@Service
public class EntityExtractionAgent implements Agent<List<ImportanceAssessedUpdateDTO>, List<EntityExtractedUpdateDTO>> {

    private static final Logger log = LoggerFactory.getLogger(EntityExtractionAgent.class);

    private static final Pattern CVE_PATTERN = Pattern.compile("cve-\\d{4}-\\d+", Pattern.CASE_INSENSITIVE);

    private static final Map<String, EntityMapping> DICTIONARY = new HashMap<>();

    static {
        addMapping("spring boot", "Spring Boot", "FRAMEWORK");
        addMapping("springboot", "Spring Boot", "FRAMEWORK");
        addMapping("spring-boot", "Spring Boot", "FRAMEWORK");
        addMapping("kubernetes", "Kubernetes", "FRAMEWORK");
        addMapping("k8s", "Kubernetes", "FRAMEWORK");
        addMapping("hibernate", "Hibernate", "FRAMEWORK");
        addMapping("react", "React", "FRAMEWORK");
        addMapping("vue", "Vue", "FRAMEWORK");
        addMapping("angular", "Angular", "FRAMEWORK");
        addMapping("flutter", "Flutter", "FRAMEWORK");
        addMapping("docker", "Docker", "FRAMEWORK");

        addMapping("java", "Java", "LANGUAGE");
        addMapping("python", "Python", "LANGUAGE");
        addMapping("rust", "Rust", "LANGUAGE");
        addMapping("go", "Go", "LANGUAGE");
        addMapping("golang", "Go", "LANGUAGE");
        addMapping("typescript", "TypeScript", "LANGUAGE");
        addMapping("ts", "TypeScript", "LANGUAGE");
        addMapping("javascript", "JavaScript", "LANGUAGE");
        addMapping("js", "JavaScript", "LANGUAGE");
        addMapping("c++", "C++", "LANGUAGE");

        addMapping("aws", "AWS", "CLOUD_PROVIDER");
        addMapping("amazon web services", "AWS", "CLOUD_PROVIDER");
        addMapping("gcp", "Google Cloud", "CLOUD_PROVIDER");
        addMapping("google cloud", "Google Cloud", "CLOUD_PROVIDER");
        addMapping("azure", "Azure", "CLOUD_PROVIDER");

        addMapping("google", "Google", "COMPANY");
        addMapping("microsoft", "Microsoft", "COMPANY");
        addMapping("amazon", "Amazon", "COMPANY");
        addMapping("github", "GitHub", "COMPANY");
        addMapping("apple", "Apple", "COMPANY");
        addMapping("openai", "OpenAI", "COMPANY");
        addMapping("meta", "Meta", "COMPANY");

        addMapping("gpt-4", "GPT-4", "AI_MODEL");
        addMapping("gpt4", "GPT-4", "AI_MODEL");
        addMapping("gpt-6", "GPT-6", "AI_MODEL");
        addMapping("gpt6", "GPT-6", "AI_MODEL");
        addMapping("llama", "Llama", "AI_MODEL");
        addMapping("gemini", "Gemini", "AI_MODEL");
        addMapping("claude", "Claude", "AI_MODEL");
    }

    private static void addMapping(String alias, String name, String type) {
        DICTIONARY.put(normalizeString(alias), new EntityMapping(name, type));
    }

    private static String normalizeString(String val) {
        if (val == null) return "";
        return val.toLowerCase().replaceAll("[\\s\\-_]", "");
    }

    @Override
    public List<EntityExtractedUpdateDTO> process(List<ImportanceAssessedUpdateDTO> input) {
        if (input == null || input.isEmpty()) {
            return Collections.emptyList();
        }

        long startTime = System.currentTimeMillis();
        long threadId = Thread.currentThread().getId();

        List<EntityExtractedUpdateDTO> results = new ArrayList<>();

        for (ImportanceAssessedUpdateDTO update : input) {
            String title = update.getCredibilityAssessedUpdate().getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getTitle();
            String content = update.getCredibilityAssessedUpdate().getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getCleanedContent();

            Set<EntityExtractedUpdateDTO.ExtractedEntity> entities = new LinkedHashSet<>();

            // 1. Check CVE patterns
            Matcher cveMatcher = CVE_PATTERN.matcher(title + " " + content);
            while (cveMatcher.find()) {
                String cve = cveMatcher.group().toUpperCase();
                entities.add(EntityExtractedUpdateDTO.ExtractedEntity.builder()
                        .name(cve)
                        .normalizedName(normalizeString(cve))
                        .type("SECURITY_VULNERABILITY")
                        .build());
            }

            // 2. Scan dictionary keywords
            String text = (title + " " + content).toLowerCase();
            for (Map.Entry<String, EntityMapping> entry : DICTIONARY.entrySet()) {
                String key = entry.getKey();
                if (text.contains(key) || text.replaceAll("[\\s\\-_]", "").contains(key)) {
                    EntityMapping mapping = entry.getValue();
                    entities.add(EntityExtractedUpdateDTO.ExtractedEntity.builder()
                            .name(mapping.name)
                            .normalizedName(normalizeString(mapping.name))
                            .type(mapping.type)
                            .build());
                }
            }

            results.add(EntityExtractedUpdateDTO.builder()
                    .importanceAssessedUpdate(update)
                    .entities(new ArrayList<>(entities))
                    .build());
        }

        long elapsed = System.currentTimeMillis() - startTime;
        log.info("[EntityExtractionAgent] [runId={}] [threadId={}] processed={} accepted={} elapsed={}ms [warnings=0 errors=0]",
                input.get(0).getCredibilityAssessedUpdate().getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getFetchedAt(),
                threadId, input.size(), results.size(), elapsed);

        return results;
    }

    private static class EntityMapping {
        final String name;
        final String type;

        EntityMapping(String name, String type) {
            this.name = name;
            this.type = type;
        }
    }
}
