package com.techpulse.agent;

import com.techpulse.agent.dto.ClassifiedUpdateDTO;
import com.techpulse.agent.dto.CleanedUpdateDTO;
import com.techpulse.agent.dto.ValidatedUpdateDTO;
import com.techpulse.agent.util.JaroWinklerSimilarity;
import com.techpulse.model.RawIngestion;
import com.techpulse.repository.RawIngestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * Agent responsible for checking Jaro-Winkler similarities and mapping Event IDs.
 */
@Service
public class DuplicateDetectionAgent implements Agent<List<ClassifiedUpdateDTO>, List<ValidatedUpdateDTO>> {

    private static final Logger log = LoggerFactory.getLogger(DuplicateDetectionAgent.class);
    private static final double SIMILARITY_THRESHOLD = 0.85;

    private final RawIngestionRepository rawIngestionRepository;

    public DuplicateDetectionAgent(RawIngestionRepository rawIngestionRepository) {
        this.rawIngestionRepository = rawIngestionRepository;
    }

    @Override
    public List<ValidatedUpdateDTO> process(List<ClassifiedUpdateDTO> input) {
        if (input == null || input.isEmpty()) {
            return Collections.emptyList();
        }

        // Fetch recent candidates for duplicate check (last 7 days)
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<RawIngestion> dbCandidates = rawIngestionRepository.findRecentRawIngestions(since);

        List<ValidatedUpdateDTO> validatedUpdates = new ArrayList<>();

        for (ClassifiedUpdateDTO current : input) {
            CleanedUpdateDTO currentUpdate = current.getCleanedUpdate();
            String currentUrl = currentUpdate.getCanonicalUrl();
            String currentTitle = currentUpdate.getTitle();

            ValidatedUpdateDTO match = null;

            // 1. Check against processed updates in the current batch
            for (ValidatedUpdateDTO processed : validatedUpdates) {
                CleanedUpdateDTO processedUpdate = processed.getClassifiedUpdate().getCleanedUpdate();

                // Rule 1: Exact URL match
                if (processedUpdate.getCanonicalUrl().equalsIgnoreCase(currentUrl)) {
                    match = ValidatedUpdateDTO.builder()
                            .classifiedUpdate(current)
                            .eventId(processed.getEventId())
                            .isDuplicate(true)
                            .matchScore(1.0)
                            .matchReason("EXACT_URL_BATCH")
                            .duplicateOfUrl(processedUpdate.getCanonicalUrl())
                            .build();
                    break;
                }

                // Rule 2: Title Jaro-Winkler Similarity & 48-hour window
                double titleSimilarity = JaroWinklerSimilarity.calculate(currentTitle, processedUpdate.getTitle());
                long hourDiff = Math.abs(Duration.between(currentUpdate.getPublishedAt(), processedUpdate.getPublishedAt()).toHours());

                if (titleSimilarity >= SIMILARITY_THRESHOLD && hourDiff <= 48) {
                    match = ValidatedUpdateDTO.builder()
                            .classifiedUpdate(current)
                            .eventId(processed.getEventId())
                            .isDuplicate(true)
                            .matchScore(titleSimilarity)
                            .matchReason("TITLE_SIMILARITY_BATCH")
                            .duplicateOfUrl(processedUpdate.getCanonicalUrl())
                            .build();
                    break;
                }
            }

            // 2. If no batch match, check against database candidates
            if (match == null) {
                for (RawIngestion candidate : dbCandidates) {
                    // Skip matching the item against itself
                    if (candidate.getUrl().equalsIgnoreCase(currentUpdate.getSourceUrl())) {
                        continue;
                    }

                    // Rule 1: Exact URL match
                    if (candidate.getCanonicalUrl() != null && candidate.getCanonicalUrl().equalsIgnoreCase(currentUrl)) {
                        String eventId = candidate.getEventId() != null ? candidate.getEventId() : UUID.randomUUID().toString();
                        match = ValidatedUpdateDTO.builder()
                                .classifiedUpdate(current)
                                .eventId(eventId)
                                .isDuplicate(true)
                                .matchScore(1.0)
                                .matchReason("EXACT_URL_DB")
                                .duplicateOfUrl(candidate.getCanonicalUrl())
                                .build();
                        break;
                    }

                    // Rule 2: Title Jaro-Winkler Similarity & 48-hour window
                    double titleSimilarity = JaroWinklerSimilarity.calculate(currentTitle, candidate.getTitle());
                    LocalDateTime candPubAt = candidate.getPublishedAt() != null ? candidate.getPublishedAt() : candidate.getFetchedAt();
                    long hourDiff = Math.abs(Duration.between(currentUpdate.getPublishedAt(), candPubAt).toHours());

                    if (titleSimilarity >= SIMILARITY_THRESHOLD && hourDiff <= 48) {
                        String eventId = candidate.getEventId() != null ? candidate.getEventId() : UUID.randomUUID().toString();
                        match = ValidatedUpdateDTO.builder()
                                .classifiedUpdate(current)
                                .eventId(eventId)
                                .isDuplicate(true)
                                .matchScore(titleSimilarity)
                                .matchReason("TITLE_SIMILARITY_DB")
                                .duplicateOfUrl(candidate.getCanonicalUrl())
                                .build();
                        break;
                    }
                }
            }

            // 3. New Event creation if no matches exist
            if (match == null) {
                String eventId = UUID.randomUUID().toString();
                match = ValidatedUpdateDTO.builder()
                        .classifiedUpdate(current)
                        .eventId(eventId)
                        .isDuplicate(false)
                        .matchScore(0.0)
                        .matchReason("NEW_EVENT")
                        .duplicateOfUrl(null)
                        .build();
            }

            validatedUpdates.add(match);
        }

        return validatedUpdates;
    }
}
