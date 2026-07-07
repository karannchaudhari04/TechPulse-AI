package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.model.UserInterest;
import com.techpulse.repository.UserInterestRepository;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Scorer mapping user dynamic interest weights against technology event metadata.
 */
@Component
public class PersonalizationScorer implements ScoringComponent {

    private final UserInterestRepository userInterestRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PersonalizationScorer(UserInterestRepository userInterestRepository) {
        this.userInterestRepository = userInterestRepository;
    }

    @Override
    public double calculate(TechnologyEvent event, Long userId) {
        if (userId == null) return 0.0;
        
        List<UserInterest> interests = userInterestRepository.findByUserId(userId);
        if (interests.isEmpty()) return 0.0;

        double maxWeight = 0.0;
        List<?> eventCats = new ArrayList<>();
        if (event.getCategoriesJson() != null) {
            try {
                eventCats = objectMapper.readValue(event.getCategoriesJson(), List.class);
            } catch (Exception ignored) {}
        }

        for (Object catObj : eventCats) {
            String cat = String.valueOf(catObj);
            Optional<UserInterest> ui = interests.stream()
                    .filter(i -> "CATEGORY".equals(i.getInterestType()) && i.getInterestKey().equalsIgnoreCase(cat))
                    .findFirst();
            if (ui.isPresent()) {
                maxWeight = Math.max(maxWeight, ui.get().getWeight());
            }
        }

        List<?> eventEntities = new ArrayList<>();
        if (event.getEntitiesJson() != null) {
            try {
                eventEntities = objectMapper.readValue(event.getEntitiesJson(), List.class);
            } catch (Exception ignored) {}
        }

        for (Object entObj : eventEntities) {
            String ent = String.valueOf(entObj);
            Optional<UserInterest> ui = interests.stream()
                    .filter(i -> "ENTITY".equals(i.getInterestType()) && i.getInterestKey().equalsIgnoreCase(ent))
                    .findFirst();
            if (ui.isPresent()) {
                maxWeight = Math.max(maxWeight, ui.get().getWeight());
            }
        }

        return Math.min(1.0, maxWeight);
    }

    @Override
    public String getName() {
        return "personalizationScore";
    }
}
