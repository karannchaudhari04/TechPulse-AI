package com.techpulse.agent;

import com.techpulse.agent.config.ClassificationProperties;
import com.techpulse.agent.dto.ClassifiedUpdateDTO;
import com.techpulse.agent.dto.CleanedUpdateDTO;
import com.techpulse.agent.model.CategoryType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Deterministic Classification Agent that matches configured keywords against title and content.
 */
@Service
public class ClassificationAgent implements Agent<CleanedUpdateDTO, ClassifiedUpdateDTO> {

    private static final Logger log = LoggerFactory.getLogger(ClassificationAgent.class);
    private final ClassificationProperties classificationProperties;

    public ClassificationAgent(ClassificationProperties classificationProperties) {
        this.classificationProperties = classificationProperties;
    }

    @Override
    public ClassifiedUpdateDTO process(CleanedUpdateDTO input) {
        Map<CategoryType, Double> categoryConfidences = new EnumMap<>(CategoryType.class);

        String titleLower = input.getTitle().toLowerCase();
        String contentLower = input.getCleanedContent().toLowerCase();
        int wordCount = countWords(titleLower + " " + contentLower);

        Map<CategoryType, List<String>> keywordRules = classificationProperties.getKeywords();
        if (keywordRules != null) {
            for (Map.Entry<CategoryType, List<String>> entry : keywordRules.entrySet()) {
                CategoryType category = entry.getKey();
                List<String> keywords = entry.getValue();

                int titleHits = 0;
                int contentHits = 0;

                for (String keyword : keywords) {
                    String kwLower = keyword.toLowerCase();
                    titleHits += countOccurrences(titleLower, kwLower);
                    contentHits += countOccurrences(contentLower, kwLower);
                }

                if (titleHits > 0 || contentHits > 0) {
                    double rawScore = (2.0 * titleHits + contentHits) / (double) Math.max(1, wordCount / 50);
                    double normalizedScore = Math.min(1.0, rawScore);
                    // Round to 2 decimal places
                    normalizedScore = Math.round(normalizedScore * 100.0) / 100.0;
                    if (normalizedScore > 0.0) {
                        categoryConfidences.put(category, normalizedScore);
                    }
                }
            }
        }

        // Fallback: Default to EMERGING_TECH if no categories matched
        if (categoryConfidences.isEmpty()) {
            categoryConfidences.put(CategoryType.EMERGING_TECH, 0.10);
        }

        return ClassifiedUpdateDTO.builder()
                .cleanedUpdate(input)
                .categoryConfidences(categoryConfidences)
                .build();
    }

    private int countOccurrences(String text, String keyword) {
        int count = 0;
        int index = 0;
        while ((index = text.indexOf(keyword, index)) != -1) {
            count++;
            index += keyword.length();
        }
        return count;
    }

    private int countWords(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return text.trim().split("\\s+").length;
    }
}
