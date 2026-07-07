package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.model.TechnologyEvent;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Similarity engine computing overlap matrices using Jaccard and timeline decay metrics.
 */
@Service
public class EventSimilarityEngine {

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Determines event similarity weights between 0.0 and 1.0.
     */
    public double calculateSimilarity(TechnologyEvent e1, TechnologyEvent e2) {
        double score = 0.0;

        Set<String> ent1 = getEntities(e1);
        Set<String> ent2 = getEntities(e2);
        double entityJaccard = calculateJaccard(ent1, ent2);
        score += 0.40 * entityJaccard;

        Set<String> cat1 = getCategories(e1);
        Set<String> cat2 = getCategories(e2);
        double catJaccard = calculateJaccard(cat1, cat2);
        score += 0.20 * catJaccard;

        if (e1.getVersionString() != null && e2.getVersionString() != null && e1.getVersionString().equalsIgnoreCase(e2.getVersionString())) {
            score += 0.10;
        }

        if (e1.getFirstSeen() != null && e2.getFirstSeen() != null) {
            long days = Math.abs(Duration.between(e1.getFirstSeen(), e2.getFirstSeen()).toDays());
            double timeScore = Math.exp(-0.05 * days);
            score += 0.30 * timeScore;
        }

        return score;
    }

    private Set<String> getEntities(TechnologyEvent event) {
        if (event.getEntitiesJson() == null) return Collections.emptySet();
        try {
            List<?> raw = objectMapper.readValue(event.getEntitiesJson(), List.class);
            return raw.stream().map(e -> String.valueOf(e).toLowerCase().trim()).collect(Collectors.toSet());
        } catch (Exception e) {
            return Collections.emptySet();
        }
    }

    private Set<String> getCategories(TechnologyEvent event) {
        if (event.getCategoriesJson() == null) return Collections.emptySet();
        try {
            List<?> raw = objectMapper.readValue(event.getCategoriesJson(), List.class);
            return raw.stream().map(e -> String.valueOf(e).toLowerCase().trim()).collect(Collectors.toSet());
        } catch (Exception e) {
            return Collections.emptySet();
        }
    }

    private double calculateJaccard(Set<String> s1, Set<String> s2) {
        if (s1.isEmpty() && s2.isEmpty()) return 1.0;
        if (s1.isEmpty() || s2.isEmpty()) return 0.0;

        Set<String> intersection = new HashSet<>(s1);
        intersection.retainAll(s2);

        Set<String> union = new HashSet<>(s1);
        union.addAll(s2);

        return (double) intersection.size() / union.size();
    }
}
