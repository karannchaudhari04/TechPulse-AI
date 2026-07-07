package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.dto.SearchResultDTO;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.TechnologyEventRepository;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Deterministic search implementation matching title tokens, categories, versions, and entities.
 */
@Component
public class DeterministicSearchStrategy implements SearchRetrievalStrategy {

    private final TechnologyEventRepository technologyEventRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DeterministicSearchStrategy(TechnologyEventRepository technologyEventRepository) {
        this.technologyEventRepository = technologyEventRepository;
    }

    @Override
    public List<SearchResultDTO> search(String query, Long userId) {
        if (query == null || query.isBlank()) return Collections.emptyList();

        String lowerQuery = query.toLowerCase().trim();
        List<TechnologyEvent> events = technologyEventRepository.findAll();
        List<SearchResultDTO> results = new ArrayList<>();

        for (TechnologyEvent event : events) {
            List<String> matchReasons = new ArrayList<>();
            double textScore = 0.0;

            if (event.getTitle().toLowerCase().contains(lowerQuery)) {
                textScore += 0.50;
                matchReasons.add("title match");
            }

            if (event.getEntitiesJson() != null) {
                try {
                    List<?> entities = objectMapper.readValue(event.getEntitiesJson(), List.class);
                    for (Object entObj : entities) {
                        String ent = String.valueOf(entObj);
                        if (ent.toLowerCase().contains(lowerQuery)) {
                            textScore += 0.30;
                            matchReasons.add("entity match: " + ent);
                        }
                    }
                } catch (Exception ignored) {}
            }

            if (event.getCategoriesJson() != null) {
                try {
                    List<?> categories = objectMapper.readValue(event.getCategoriesJson(), List.class);
                    for (Object catObj : categories) {
                        String cat = String.valueOf(catObj);
                        if (cat.toLowerCase().contains(lowerQuery)) {
                            textScore += 0.20;
                            matchReasons.add("category match: " + cat);
                        }
                    }
                } catch (Exception ignored) {}
            }

            if (event.getVersionString() != null && event.getVersionString().toLowerCase().contains(lowerQuery)) {
                textScore += 0.15;
                matchReasons.add("version match: " + event.getVersionString());
            }

            if (textScore > 0.0) {
                double importanceVal = event.getImportanceScore() != null ? event.getImportanceScore() : 0.0;
                double credibilityVal = event.getCredibilityScore() != null ? event.getCredibilityScore() : 0.0;
                double finalScore = textScore + (0.20 * importanceVal) + (0.10 * credibilityVal);

                results.add(SearchResultDTO.builder()
                        .eventId(event.getId())
                        .title(event.getTitle())
                        .relevanceScore(finalScore)
                        .matchReasons(matchReasons)
                        .build());
            }
        }

        results.sort((a, b) -> Double.compare(b.getRelevanceScore(), a.getRelevanceScore()));
        return results;
    }
}
