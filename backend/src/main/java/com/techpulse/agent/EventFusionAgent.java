package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.dto.*;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.TechnologyEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Agent responsible for grouping and fusing updates into TechnologyEvents.
 * Implements version-aware release boundaries and event lifecycle transition checks.
 */
@Service
public class EventFusionAgent implements Agent<List<EntityExtractedUpdateDTO>, List<TechnologyEventDTO>> {

    private static final Logger log = LoggerFactory.getLogger(EventFusionAgent.class);

    private static final Pattern SEMVER_PATTERN = Pattern.compile("\\b(v?\\d+\\.\\d+(\\.\\d+)?(-[a-zA-Z0-9.]+)?)\\b");
    private static final Pattern NAMED_VERSION_PATTERN = Pattern.compile("\\b(gpt-\\d+|java\\s*\\d+|node\\.js\\s*\\d+)\\b", Pattern.CASE_INSENSITIVE);

    private final TechnologyEventRepository technologyEventRepository;
    private final ObjectMapper objectMapper;

    public EventFusionAgent(TechnologyEventRepository technologyEventRepository) {
        this.technologyEventRepository = technologyEventRepository;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public List<TechnologyEventDTO> process(List<EntityExtractedUpdateDTO> input) {
        if (input == null || input.isEmpty()) {
            return Collections.emptyList();
        }

        long startTime = System.currentTimeMillis();
        long threadId = Thread.currentThread().getId();

        // 1. Group by duplicate eventId
        Map<String, List<EntityExtractedUpdateDTO>> byEventId = new HashMap<>();
        for (EntityExtractedUpdateDTO dto : input) {
            String eventId = dto.getImportanceAssessedUpdate().getCredibilityAssessedUpdate().getValidatedUpdate().getEventId();
            byEventId.computeIfAbsent(eventId, k -> new ArrayList<>()).add(dto);
        }

        List<TechnologyEventDTO> fusedEvents = new ArrayList<>();

        for (Map.Entry<String, List<EntityExtractedUpdateDTO>> entry : byEventId.entrySet()) {
            String duplicateEventId = entry.getKey();
            List<EntityExtractedUpdateDTO> group = entry.getValue();

            EntityExtractedUpdateDTO lead = group.stream()
                    .max(Comparator.comparingDouble(u -> u.getImportanceAssessedUpdate().getAssessment().getScore()))
                    .orElse(group.get(0));

            CleanedUpdateDTO cleanLead = lead.getImportanceAssessedUpdate().getCredibilityAssessedUpdate().getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate();
            String title = cleanLead.getTitle();

            // 2. Extract versions
            VersionInfo version = extractVersion(title + " " + cleanLead.getCleanedContent());

            // 3. Extract Categories & entity details
            Set<String> categories = new LinkedHashSet<>();
            double maxCredibility = 0.0;
            double maxImportance = 0.0;
            LocalDateTime firstSeen = null;
            LocalDateTime lastUpdated = null;
            Set<String> entityNames = new LinkedHashSet<>();

            for (EntityExtractedUpdateDTO u : group) {
                Map<com.techpulse.agent.model.CategoryType, Double> conf = u.getImportanceAssessedUpdate().getCredibilityAssessedUpdate().getValidatedUpdate().getClassifiedUpdate().getCategoryConfidences();
                if (conf != null) {
                    for (com.techpulse.agent.model.CategoryType cat : conf.keySet()) {
                        categories.add(cat.name());
                    }
                }

                maxCredibility = Math.max(maxCredibility, u.getImportanceAssessedUpdate().getCredibilityAssessedUpdate().getAssessment().getScore());
                maxImportance = Math.max(maxImportance, u.getImportanceAssessedUpdate().getAssessment().getScore());

                LocalDateTime pub = u.getImportanceAssessedUpdate().getCredibilityAssessedUpdate().getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getPublishedAt();
                LocalDateTime fetch = u.getImportanceAssessedUpdate().getCredibilityAssessedUpdate().getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getFetchedAt();
                LocalDateTime time = pub != null ? pub : fetch;

                if (firstSeen == null || time.isBefore(firstSeen)) {
                    firstSeen = time;
                }
                if (lastUpdated == null || time.isAfter(lastUpdated)) {
                    lastUpdated = time;
                }

                for (EntityExtractedUpdateDTO.ExtractedEntity ent : u.getEntities()) {
                    entityNames.add(ent.getName());
                }
            }

            // 4. Determine lifecycle status
            String lifecycleStatus = detectLifecycleStatus(title);

            // 5. Event Change Detection / Transition check
            String eventIdToUse = duplicateEventId;
            double mergeConfidence = 1.0;
            
            if (!entityNames.isEmpty()) {
                String primaryEntity = entityNames.iterator().next();
                Optional<TechnologyEvent> existingOpt = technologyEventRepository.findAll().stream()
                        .filter(e -> e.getEntitiesJson() != null && e.getEntitiesJson().contains(primaryEntity))
                        .filter(e -> Objects.equals(e.getVersionString(), version.versionString))
                        .findFirst();

                if (existingOpt.isPresent()) {
                    TechnologyEvent existing = existingOpt.get();
                    eventIdToUse = existing.getId();
                    mergeConfidence = 0.80;
                    log.info("[EventFusionAgent] Transition detected for entity '{}': reusing Event ID {}", primaryEntity, eventIdToUse);
                }
            }

            String categoriesJson = "";
            String entitiesJson = "";
            try {
                categoriesJson = objectMapper.writeValueAsString(categories);
                entitiesJson = objectMapper.writeValueAsString(entityNames);
            } catch (Exception ex) {
                log.error("Failed to serialize fusion JSON attributes: {}", ex.getMessage());
            }

            TechnologyEvent event = TechnologyEvent.builder()
                    .id(eventIdToUse)
                    .title(title)
                    .categoriesJson(categoriesJson)
                    .credibilityScore(maxCredibility)
                    .importanceScore(maxImportance)
                    .mergeConfidence(mergeConfidence)
                    .firstSeen(firstSeen)
                    .lastUpdated(lastUpdated)
                    .lifecycleStatus(lifecycleStatus)
                    .majorVersion(version.major)
                    .minorVersion(version.minor)
                    .patchVersion(version.patch)
                    .versionString(version.versionString)
                    .entitiesJson(entitiesJson)
                    .build();

            fusedEvents.add(TechnologyEventDTO.builder()
                    .event(event)
                    .supportingUpdates(group)
                    .build());
        }

        long elapsed = System.currentTimeMillis() - startTime;
        log.info("[EventFusionAgent] [runId={}] [threadId={}] processed={} accepted={} elapsed={}ms [warnings=0 errors=0]",
                input.get(0).getImportanceAssessedUpdate().getCredibilityAssessedUpdate().getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getFetchedAt(),
                threadId, input.size(), fusedEvents.size(), elapsed);

        return fusedEvents;
    }

    private VersionInfo extractVersion(String text) {
        Matcher semverMatcher = SEMVER_PATTERN.matcher(text);
        if (semverMatcher.find()) {
            String verStr = semverMatcher.group(1);
            String cleanVer = verStr.startsWith("v") ? verStr.substring(1) : verStr;
            String[] parts = cleanVer.split("\\.");
            int major = 0;
            int minor = 0;
            int patch = 0;
            try {
                if (parts.length > 0) major = Integer.parseInt(parts[0]);
                if (parts.length > 1) minor = Integer.parseInt(parts[1]);
                if (parts.length > 2) patch = Integer.parseInt(parts[2].replaceAll("[^0-9]", ""));
            } catch (Exception ignored) {}
            return new VersionInfo(major, minor, patch, verStr);
        }

        Matcher namedMatcher = NAMED_VERSION_PATTERN.matcher(text);
        if (namedMatcher.find()) {
            String verStr = namedMatcher.group(1);
            String digits = verStr.replaceAll("[^0-9]", "");
            int major = 0;
            try {
                if (!digits.isEmpty()) {
                    major = Integer.parseInt(digits);
                }
            } catch (Exception ignored) {}
            return new VersionInfo(major, 0, 0, verStr);
        }

        return new VersionInfo(null, null, null, null);
    }

    private String detectLifecycleStatus(String title) {
        String lower = title.toLowerCase();
        if (lower.contains("rc") || lower.contains("release candidate")) {
            return "RC";
        } else if (lower.contains("beta")) {
            return "BETA";
        } else if (lower.contains("preview") || lower.contains("introducing")) {
            return "ANNOUNCED";
        } else if (lower.contains("stable") || lower.contains("released") || lower.contains("ga") || lower.contains("launch")) {
            return "GA";
        } else if (lower.contains("patch") || lower.contains("fix") || lower.contains("hotfix")) {
            return "PATCH";
        } else if (lower.contains("cve") || lower.contains("vulnerability") || lower.contains("exploit") || lower.contains("security fix")) {
            return "SECURITY_FIX";
        } else if (lower.contains("deprecated") || lower.contains("deprecation")) {
            return "DEPRECATED";
        }
        return "UNKNOWN";
    }

    private static class VersionInfo {
        final Integer major;
        final Integer minor;
        final Integer patch;
        final String versionString;

        VersionInfo(Integer major, Integer minor, Integer patch, String versionString) {
            this.major = major;
            this.minor = minor;
            this.patch = patch;
            this.versionString = versionString;
        }
    }
}
