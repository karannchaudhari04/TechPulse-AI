package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.model.*;
import com.techpulse.repository.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Agent continuously extracting user interests from interaction log events.
 */
@Service
public class InterestExtractionAgent {

    private final InteractionLogRepository interactionLogRepository;
    private final UserInterestRepository userInterestRepository;
    private final TechnologyEventRepository technologyEventRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public InterestExtractionAgent(InteractionLogRepository interactionLogRepository,
                                  UserInterestRepository userInterestRepository,
                                  TechnologyEventRepository technologyEventRepository) {
        this.interactionLogRepository = interactionLogRepository;
        this.userInterestRepository = userInterestRepository;
        this.technologyEventRepository = technologyEventRepository;
    }

    /**
     * Aggregates interaction logs for a user, decays them, and updates user_interest.
     */
    @Transactional
    public void processInteractionsForUser(Long userId) {
        List<InteractionLog> logs = interactionLogRepository.findByUserId(userId);
        if (logs.isEmpty()) return;

        Map<String, Map<String, Double>> interestMap = new HashMap<>();

        for (InteractionLog log : logs) {
            double baseWeight = getInteractionWeight(log.getInteractionType());
            long days = Duration.between(log.getCreatedAt(), LocalDateTime.now()).toDays();
            double decayedWeight = baseWeight * Math.exp(-0.05 * days);

            if (log.getEventId() != null && log.getEventId().startsWith("category:")) {
                String cat = log.getEventId().substring("category:".length());
                addWeight(interestMap, "CATEGORY", cat, decayedWeight);
            } else if (log.getEventId() != null && log.getEventId().startsWith("entity:")) {
                String ent = log.getEventId().substring("entity:".length());
                addWeight(interestMap, "ENTITY", ent, decayedWeight);
            } else {
                Optional<TechnologyEvent> eventOpt = technologyEventRepository.findById(log.getEventId());
                if (eventOpt.isPresent()) {
                    TechnologyEvent event = eventOpt.get();

                    if (event.getCategoriesJson() != null) {
                        try {
                            List<?> cats = objectMapper.readValue(event.getCategoriesJson(), List.class);
                            for (Object catObj : cats) {
                                addWeight(interestMap, "CATEGORY", String.valueOf(catObj), decayedWeight);
                            }
                        } catch (Exception ignored) {}
                    }

                    if (event.getEntitiesJson() != null) {
                        try {
                            List<?> ents = objectMapper.readValue(event.getEntitiesJson(), List.class);
                            for (Object entObj : ents) {
                                addWeight(interestMap, "ENTITY", String.valueOf(entObj), decayedWeight);
                            }
                        } catch (Exception ignored) {}
                    }
                }
            }
        }

        for (Map.Entry<String, Map<String, Double>> typeEntry : interestMap.entrySet()) {
            String type = typeEntry.getKey();
            for (Map.Entry<String, Double> keyEntry : typeEntry.getValue().entrySet()) {
                String key = keyEntry.getKey();
                double weight = Math.min(1.0, keyEntry.getValue());

                UserInterest ui = UserInterest.builder()
                        .userId(userId)
                        .interestType(type)
                        .interestKey(key)
                        .weight(weight)
                        .lastInteractionAt(LocalDateTime.now())
                        .build();
                userInterestRepository.save(ui);
            }
        }
    }

    private void addWeight(Map<String, Map<String, Double>> map, String type, String key, double val) {
        map.computeIfAbsent(type, k -> new HashMap<>())
           .merge(key, val, Double::sum);
    }

    private double getInteractionWeight(String type) {
        return switch (type.toUpperCase()) {
            case "VIEW" -> 0.10;
            case "SEARCH" -> 0.15;
            case "READ_COMPLETE" -> 0.20;
            case "SHARE" -> 0.25;
            case "BOOKMARK" -> 0.30;
            default -> 0.05;
        };
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void processAllUsers() {
        List<Long> userIds = interactionLogRepository.findAll().stream()
                .map(InteractionLog::getUserId)
                .distinct()
                .toList();

        for (Long uid : userIds) {
            processInteractionsForUser(uid);
        }
    }
}
