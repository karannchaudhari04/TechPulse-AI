package com.techpulse.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.dto.TrendReportDTO;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.TechnologyEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Service implementation managing trends reports calculation.
 */
@Service
public class TrendServiceImpl implements TrendService {

    private static final Logger log = LoggerFactory.getLogger(TrendServiceImpl.class);

    private final TechnologyEventRepository technologyEventRepository;
    private final ObjectMapper objectMapper;

    public TrendServiceImpl(TechnologyEventRepository technologyEventRepository) {
        this.technologyEventRepository = technologyEventRepository;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    @Cacheable(value = "trends", key = "'all'", unless = "#result == null")
    public List<TrendReportDTO> calculateTrends() {
        long startTime = System.currentTimeMillis();
        List<TechnologyEvent> events = technologyEventRepository.findAll();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime t7d = now.minusDays(7);
        LocalDateTime t14d = now.minusDays(14);
        LocalDateTime t21d = now.minusDays(21);

        Set<String> uniqueEntities = new HashSet<>();
        for (TechnologyEvent event : events) {
            List<String> topics = parseJsonList(event.getEntitiesJson());
            for (String t : topics) {
                if (t != null && !t.isBlank()) {
                    uniqueEntities.add(t);
                }
            }
        }

        List<TrendReportDTO> reports = new ArrayList<>();

        for (String name : uniqueEntities) {
            int currentCount = 0;
            int previousCount = 0;
            int prePrevCount = 0;

            double credibilitySum = 0.0;
            double importanceSum = 0.0;

            for (TechnologyEvent event : events) {
                List<String> topics = parseJsonList(event.getEntitiesJson());
                if (topics.stream().anyMatch(t -> t.equalsIgnoreCase(name))) {
                    LocalDateTime time = event.getLastUpdated() != null ? event.getLastUpdated() : event.getFirstSeen();
                    if (time == null) continue;

                    double cred = event.getCredibilityScore() != null ? event.getCredibilityScore() : 80.0;
                    double imp = event.getImportanceScore() != null ? event.getImportanceScore() : 70.0;

                    if (time.isAfter(t7d)) {
                        currentCount++;
                        credibilitySum += cred;
                        importanceSum += imp;
                    } else if (time.isAfter(t14d)) {
                        previousCount++;
                    } else if (time.isAfter(t21d)) {
                        prePrevCount++;
                    }
                }
            }

            double meanCred = currentCount > 0 ? (credibilitySum / currentCount) / 100.0 : 0.80;
            double meanImp = currentCount > 0 ? (importanceSum / currentCount) / 100.0 : 0.70;

            double growthRate = previousCount > 0 
                    ? (double) (currentCount - previousCount) / previousCount 
                    : (currentCount > 0 ? 1.0 : 0.0);

            double prevGrowthRate = prePrevCount > 0 
                    ? (double) (previousCount - prePrevCount) / prePrevCount 
                    : (previousCount > 0 ? 1.0 : 0.0);

            double velocity = growthRate - prevGrowthRate;

            double mentionWeight = Math.min(1.0, (double) currentCount / 10.0);
            double score = 0.25 * mentionWeight 
                    + 0.25 * Math.max(0.0, Math.min(1.0, growthRate))
                    + 0.25 * Math.max(0.0, Math.min(1.0, velocity))
                    + 0.125 * meanCred
                    + 0.125 * meanImp;

            score = Math.max(0.0, Math.min(1.0, score));
            score = Math.round(score * 100.0) / 100.0;

            String label = mapTrendLabel(score);

            reports.add(TrendReportDTO.builder()
                    .entityName(name)
                    .type("TOPIC")
                    .currentCount(currentCount)
                    .previousCount(previousCount)
                    .growthRate(Math.round(growthRate * 100.0) / 100.0)
                    .velocity(Math.round(velocity * 100.0) / 100.0)
                    .trendScore(score)
                    .trendLabel(label)
                    .build());
        }

        reports.sort((a, b) -> Double.compare(b.getTrendScore(), a.getTrendScore()));

        long elapsed = System.currentTimeMillis() - startTime;
        log.info("[TrendService] Trends calculation finished in {}ms. Processed {} entities.", elapsed, reports.size());

        return reports;
    }

    private String mapTrendLabel(double score) {
        if (score >= 0.85) {
            return "Exploding";
        } else if (score >= 0.70) {
            return "Rising";
        } else if (score >= 0.50) {
            return "Stable";
        } else if (score >= 0.30) {
            return "Cooling";
        } else if (score >= 0.15) {
            return "Declining";
        }
        return "Dormant";
    }

    private List<String> parseJsonList(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            String clean = json.replace("[", "").replace("]", "").replace("\"", "");
            if (clean.trim().isEmpty()) {
                return Collections.emptyList();
            }
            return Arrays.stream(clean.split(","))
                    .map(String::trim)
                    .toList();
        }
    }
}
