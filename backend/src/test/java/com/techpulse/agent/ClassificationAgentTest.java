package com.techpulse.agent;

import com.techpulse.agent.config.ClassificationProperties;
import com.techpulse.agent.dto.ClassifiedUpdateDTO;
import com.techpulse.agent.dto.CleanedUpdateDTO;
import com.techpulse.agent.model.CategoryType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test verifying keyword mappings, scoring confidence, and multi-category classification.
 */
public class ClassificationAgentTest {

    private ClassificationAgent classificationAgent;

    @BeforeEach
    public void setUp() {
        ClassificationProperties props = new ClassificationProperties();
        Map<CategoryType, List<String>> keywords = new HashMap<>();
        keywords.put(CategoryType.SYSTEM_DESIGN_BACKEND, List.of("java", "jvm", "jdk"));
        keywords.put(CategoryType.AI_MACHINE_LEARNING, List.of("gpt", "llm", "openai", "ai"));
        keywords.put(CategoryType.CLOUD_DEVOPS, List.of("aws", "docker", "kubernetes"));

        props.setKeywords(keywords);
        classificationAgent = new ClassificationAgent(props);
    }

    @Test
    public void testJavaClassification() {
        CleanedUpdateDTO dto = CleanedUpdateDTO.builder()
                .title("New Java Release")
                .cleanedContent("Oracle announced a brand new version of the JDK today.")
                .sourceUrl("http://foo.com/1")
                .publishedAt(LocalDateTime.now())
                .build();

        ClassifiedUpdateDTO result = classificationAgent.process(dto);
        assertNotNull(result);
        assertTrue(result.getCategoryConfidences().containsKey(CategoryType.SYSTEM_DESIGN_BACKEND));
        assertTrue(result.getCategoryConfidences().get(CategoryType.SYSTEM_DESIGN_BACKEND) > 0.0);
    }

    @Test
    public void testAiClassification() {
        CleanedUpdateDTO dto = CleanedUpdateDTO.builder()
                .title("Introducing GPT-5")
                .cleanedContent("OpenAI released a major upgrade to their LLM architecture.")
                .sourceUrl("http://foo.com/2")
                .publishedAt(LocalDateTime.now())
                .build();

        ClassifiedUpdateDTO result = classificationAgent.process(dto);
        assertNotNull(result);
        assertTrue(result.getCategoryConfidences().containsKey(CategoryType.AI_MACHINE_LEARNING));
    }

    @Test
    public void testMultiCategoryClassification() {
        CleanedUpdateDTO dto = CleanedUpdateDTO.builder()
                .title("Java on AWS Lambda")
                .cleanedContent("This article shows how to run Spring Boot applications on serverless containers in Docker.")
                .sourceUrl("http://foo.com/3")
                .publishedAt(LocalDateTime.now())
                .build();

        ClassifiedUpdateDTO result = classificationAgent.process(dto);
        assertNotNull(result);
        assertTrue(result.getCategoryConfidences().containsKey(CategoryType.SYSTEM_DESIGN_BACKEND));
        assertTrue(result.getCategoryConfidences().containsKey(CategoryType.CLOUD_DEVOPS));
    }
}
