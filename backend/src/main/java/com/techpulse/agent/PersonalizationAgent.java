package com.techpulse.agent;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.model.InteractionLog;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.model.UserHistoryLog;
import com.techpulse.model.UserInterest;
import com.techpulse.model.UserInterestId;
import com.techpulse.model.User;
import com.techpulse.repository.InteractionLogRepository;
import com.techpulse.repository.TechnologyEventRepository;
import com.techpulse.repository.UserHistoryLogRepository;
import com.techpulse.repository.UserInterestRepository;
import com.techpulse.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Records user interactions and maintains user interest profiles while ordering feeds by recency.
 */
@Service
public class PersonalizationAgent {

    private static final Logger log = LoggerFactory.getLogger(PersonalizationAgent.class);

    private final UserInterestRepository userInterestRepository;
    private final UserHistoryLogRepository userHistoryLogRepository;
    private final TechnologyEventRepository technologyEventRepository;
    private final InteractionLogRepository interactionLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public PersonalizationAgent(UserInterestRepository userInterestRepository,
                                UserHistoryLogRepository userHistoryLogRepository,
                                TechnologyEventRepository technologyEventRepository,
                                InteractionLogRepository interactionLogRepository,
                                UserRepository userRepository) {
        this.userInterestRepository = userInterestRepository;
        this.userHistoryLogRepository = userHistoryLogRepository;
        this.technologyEventRepository = technologyEventRepository;
        this.interactionLogRepository = interactionLogRepository;
        this.userRepository = userRepository;
        this.objectMapper = new ObjectMapper();
    }

    @Transactional
    public void recordInteraction(Long userId, String eventId, String type, String value) {
        log.info("[PersonalizationAgent] Recording interaction: userId={}, eventId={}, type={}, value={}", 
                userId, eventId, type, value);

        Optional<TechnologyEvent> eventOpt = technologyEventRepository.findById(eventId);
        if (eventOpt.isEmpty()) {
            log.warn("[PersonalizationAgent] Event not found for interaction: eventId={}", eventId);
            return;
        }

        TechnologyEvent event = eventOpt.get();

        // 1. Save Raw Interaction Log
        InteractionLog interactionLog = InteractionLog.builder()
                .userId(userId)
                .eventId(eventId)
                .interactionType(type)
                .interactionValue(value)
                .createdAt(LocalDateTime.now())
                .build();
        interactionLogRepository.save(interactionLog);

        // 2. Determine weight delta
        double delta = switch (type.toUpperCase()) {
            case "LIKE" -> 3.0;
            case "BOOKMARK" -> 5.0;
            case "SHARE" -> 6.0;
            case "READ_COMPLETE" -> 4.0;
            case "CLICK", "VIEW" -> 1.0;
            case "SKIP" -> -2.0;
            case "DISMISS" -> -3.0;
            default -> 0.0;
        };

        if (delta != 0.0) {
            updateUserInterests(userId, event, delta);
        }

        // 3. Log user history metrics where applicable
        updateUserHistoryLog(userId, eventId, type, value);
    }

    private void updateUserInterests(Long userId, TechnologyEvent event, double delta) {
        List<String> categories = parseJsonList(event.getCategoriesJson());
        List<String> topics = parseJsonList(event.getEntitiesJson());

        // Update Category Interests
        for (String category : categories) {
            updateSingleInterest(userId, "CATEGORY", category, delta);
        }

        // Update Topic Interests
        for (String topic : topics) {
            updateSingleInterest(userId, "TOPIC", topic, delta);
        }
    }

    private void updateSingleInterest(Long userId, String interestType, String interestKey, double delta) {
        UserInterestId id = new UserInterestId(userId, interestType, interestKey);
        UserInterest interest = userInterestRepository.findById(id).orElseGet(() -> 
            UserInterest.builder()
                    .userId(userId)
                    .interestType(interestType)
                    .interestKey(interestKey)
                    .weight(0.0)
                    .build()
        );

        double newWeight = interest.getWeight() + delta;
        // Clip weights between -10.0 and +20.0
        newWeight = Math.max(-10.0, Math.min(20.0, newWeight));
        interest.setWeight(newWeight);
        interest.setLastInteractionAt(LocalDateTime.now());
        userInterestRepository.save(interest);
    }

    private void updateUserHistoryLog(Long userId, String eventId, String type, String value) {
        if ("VIEW".equals(type) || "CLICK".equals(type) || "READ_COMPLETE".equals(type)) {
            UserHistoryLog historyLog = userHistoryLogRepository.findByUserIdAndEventId(userId, eventId)
                    .orElseGet(() -> UserHistoryLog.builder()
                            .userId(userId)
                            .eventId(eventId)
                            .build()
                    );

            historyLog.setLastOpened(LocalDateTime.now());

            if ("READ_COMPLETE".equals(type)) {
                historyLog.setCompletionPercentage(100);
            }

            if (value != null && !value.isBlank()) {
                try {
                    int val = Integer.parseInt(value);
                    if (val > 100) {
                        historyLog.setReadingDurationSec(val);
                    } else if (val >= 0) {
                        historyLog.setCompletionPercentage(val);
                    }
                } catch (NumberFormatException ignored) {}
            }

            userHistoryLogRepository.save(historyLog);
        }
    }

    public List<TechnologyEvent> sortNewestFirst(List<TechnologyEvent> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return Collections.emptyList();
        }
        candidates.sort(Comparator
                .comparing(TechnologyEvent::getFirstSeen, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(TechnologyEvent::getLastUpdated, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(TechnologyEvent::getId, Comparator.nullsLast(Comparator.reverseOrder())));
        return candidates;
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
