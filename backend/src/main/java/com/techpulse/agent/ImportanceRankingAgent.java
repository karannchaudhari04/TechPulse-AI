package com.techpulse.agent;

import com.techpulse.agent.config.ImportanceProperties;
import com.techpulse.agent.dto.*;
import com.techpulse.agent.model.ImportanceLevel;
import com.techpulse.agent.model.ImportanceReason;
import com.techpulse.agent.util.FreshnessScorer;
import com.techpulse.agent.util.ThresholdFreshnessScorer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Agent responsible for calculating the deterministic ecosystem importance scoring breakdown,
 * level, and confidence indicators for grouped events.
 */
@Service
public class ImportanceRankingAgent implements Agent<List<CredibilityAssessedUpdateDTO>, List<ImportanceAssessedUpdateDTO>> {

    private static final Logger log = LoggerFactory.getLogger(ImportanceRankingAgent.class);

    // Standard Breakdown Keys
    public static final String KEY_CATEGORY_WEIGHT = "CATEGORY_WEIGHT";
    public static final String KEY_FRESHNESS_BONUS = "FRESHNESS_BONUS";
    public static final String KEY_OFFICIAL_RELEASE_BONUS = "OFFICIAL_RELEASE_BONUS";
    public static final String KEY_ORG_DIVERSITY_BONUS = "ORG_DIVERSITY_BONUS";
    public static final String KEY_MAJOR_RELEASE_BONUS = "MAJOR_RELEASE_BONUS";
    public static final String KEY_SECURITY_BONUS = "SECURITY_BONUS";
    public static final String KEY_BREAKING_CHANGE_BONUS = "BREAKING_CHANGE_BONUS";

    // Regex patterns
    private static final Pattern SEMVER_PATTERN = Pattern.compile("\\b(v?\\d+\\.\\d+(\\.\\d+)?(-[a-zA-Z0-9.]+)?)\\b");
    private static final Pattern RELEASE_KEYWORDS_PATTERN = Pattern.compile("\\b(GA|Stable|Released|Launch|LTS|Preview|RC|Beta)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern SECURITY_PATTERN = Pattern.compile(
            "\\b(CVE-\\d{4}-\\d+|Security|Vulnerability|Patch|Critical|Exploit|RCE|Zero-Day|Authentication Bypass|Privilege Escalation)\\b",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern BREAKING_CHANGE_PATTERN = Pattern.compile(
            "\\b(Breaking|Deprecated|Migration|Removed|API Change)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private final ImportanceProperties importanceProperties;
    private final FreshnessScorer freshnessScorer;

    public ImportanceRankingAgent(ImportanceProperties importanceProperties) {
        this.importanceProperties = importanceProperties;
        this.freshnessScorer = new ThresholdFreshnessScorer(importanceProperties.getFreshness());
    }

    @Override
    public List<ImportanceAssessedUpdateDTO> process(List<CredibilityAssessedUpdateDTO> input) {
        if (input == null || input.isEmpty()) {
            return Collections.emptyList();
        }

        long startTime = System.currentTimeMillis();
        long threadId = Thread.currentThread().getId();

        // Group by eventId
        Map<String, List<CredibilityAssessedUpdateDTO>> groupedEvents = new HashMap<>();
        for (CredibilityAssessedUpdateDTO dto : input) {
            groupedEvents.computeIfAbsent(dto.getValidatedUpdate().getEventId(), k -> new ArrayList<>()).add(dto);
        }

        List<ImportanceAssessedUpdateDTO> results = new ArrayList<>();
        double totalScoreSum = 0.0;
        long criticalCount = 0;

        for (Map.Entry<String, List<CredibilityAssessedUpdateDTO>> entry : groupedEvents.entrySet()) {
            List<CredibilityAssessedUpdateDTO> updates = entry.getValue();

            // 1. Category Weight calculation
            double maxCategoryWeight = 0.50;
            for (CredibilityAssessedUpdateDTO u : updates) {
                Map<com.techpulse.agent.model.CategoryType, Double> conf = u.getValidatedUpdate().getClassifiedUpdate().getCategoryConfidences();
                if (conf != null) {
                    for (com.techpulse.agent.model.CategoryType cat : conf.keySet()) {
                        Double weight = importanceProperties.getCategoryWeights() != null
                                ? importanceProperties.getCategoryWeights().get(cat.name())
                                : null;
                        if (weight != null && weight > maxCategoryWeight) {
                            maxCategoryWeight = weight;
                        }
                    }
                }
            }

            // 2. Freshness score
            LocalDateTime newestPublishTime = null;
            for (CredibilityAssessedUpdateDTO u : updates) {
                LocalDateTime pub = u.getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getPublishedAt();
                if (pub != null) {
                    if (newestPublishTime == null || pub.isAfter(newestPublishTime)) {
                        newestPublishTime = pub;
                    }
                }
            }
            double freshnessBonus = newestPublishTime != null 
                    ? freshnessScorer.calculateFreshnessScore(newestPublishTime, LocalDateTime.now())
                    : 0.0;

            // 3. Official Release Bonus
            boolean isOfficial = false;
            for (CredibilityAssessedUpdateDTO u : updates) {
                if (u.getAssessment().isOfficial()) {
                    isOfficial = true;
                    break;
                }
            }
            double officialBonus = isOfficial ? importanceProperties.getBonuses().getOfficialRelease() : 0.0;

            // 4. Organization Diversity Bonus
            Set<String> uniqueOrgs = new HashSet<>();
            for (CredibilityAssessedUpdateDTO u : updates) {
                String url = u.getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getCanonicalUrl();
                uniqueOrgs.add(extractOrgIndicator(url));
            }
            int orgCount = uniqueOrgs.size();
            double orgBonus = 0.0;
            if (orgCount == 2) {
                orgBonus = importanceProperties.getBonuses().getMultipleOrganizations() * 1.0;
            } else if (orgCount == 3) {
                orgBonus = importanceProperties.getBonuses().getMultipleOrganizations() * 1.5;
            } else if (orgCount >= 4) {
                orgBonus = importanceProperties.getBonuses().getMultipleOrganizations() * 2.0;
            }

            // 5. Major Release Detection
            boolean matchesMajorRelease = false;
            for (CredibilityAssessedUpdateDTO u : updates) {
                String title = u.getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getTitle();
                if (SEMVER_PATTERN.matcher(title).find() || RELEASE_KEYWORDS_PATTERN.matcher(title).find()) {
                    matchesMajorRelease = true;
                    break;
                }
            }
            double releaseBonus = matchesMajorRelease ? importanceProperties.getBonuses().getMajorVersion() : 0.0;

            // 6. Security Vulnerability Detection
            boolean matchesSecurity = false;
            for (CredibilityAssessedUpdateDTO u : updates) {
                String title = u.getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getTitle();
                String content = u.getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getCleanedContent();
                if (SECURITY_PATTERN.matcher(title).find() || SECURITY_PATTERN.matcher(content).find()) {
                    matchesSecurity = true;
                    break;
                }
            }
            double securityBonus = matchesSecurity ? importanceProperties.getBonuses().getSecurity() : 0.0;

            // 7. Breaking Change Detection
            boolean matchesBreaking = false;
            for (CredibilityAssessedUpdateDTO u : updates) {
                String title = u.getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getTitle();
                String content = u.getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getCleanedContent();
                if (BREAKING_CHANGE_PATTERN.matcher(title).find() || BREAKING_CHANGE_PATTERN.matcher(content).find()) {
                    matchesBreaking = true;
                    break;
                }
            }
            double breakingBonus = matchesBreaking ? importanceProperties.getBonuses().getBreakingChange() : 0.0;

            // 8. Score aggregation
            double score = maxCategoryWeight + freshnessBonus + officialBonus + orgBonus + releaseBonus + securityBonus + breakingBonus;
            score = Math.max(0.0, Math.min(1.0, score));
            score = Math.round(score * 100.0) / 100.0;

            totalScoreSum += score;

            // 9. Confidence
            double confidence = isOfficial ? 1.0 : (orgCount > 1 ? 0.90 : 0.70);

            // 10. Importance Level
            ImportanceLevel level = ImportanceLevel.BACKGROUND;
            if (score >= 0.85) {
                level = ImportanceLevel.CRITICAL;
                criticalCount++;
            } else if (score >= 0.70) {
                level = ImportanceLevel.HIGH;
            } else if (score >= 0.50) {
                level = ImportanceLevel.MEDIUM;
            } else if (score >= 0.30) {
                level = ImportanceLevel.LOW;
            } else {
                level = ImportanceLevel.BACKGROUND;
            }

            // Reasons & Evidence
            List<ImportanceReason> reasons = new ArrayList<>();
            List<String> evidence = new ArrayList<>();

            if (maxCategoryWeight > 0.80) {
                reasons.add(ImportanceReason.HIGH_CATEGORY_WEIGHT);
                evidence.add("Categorized under a high-weight domain category.");
            }
            if (freshnessBonus > 0.0) {
                reasons.add(ImportanceReason.VERY_RECENT);
                evidence.add("Published within configured freshness threshold.");
            }
            if (isOfficial) {
                reasons.add(ImportanceReason.OFFICIAL_RELEASE);
                evidence.add("Verified announcement from an official vendor channel.");
            }
            if (orgCount > 1) {
                reasons.add(ImportanceReason.MULTIPLE_ORGANIZATIONS);
                evidence.add("Cross-checked across " + orgCount + " independent organizations.");
            }
            if (matchesMajorRelease) {
                reasons.add(ImportanceReason.MAJOR_RELEASE);
                evidence.add("Recognized release naming pattern or semantic version numbering.");
            }
            if (matchesSecurity) {
                reasons.add(ImportanceReason.SECURITY_UPDATE);
                evidence.add("Vulnerability exploit vector or security patch warning.");
            }
            if (matchesBreaking) {
                reasons.add(ImportanceReason.BREAKING_CHANGE);
                evidence.add("Breaking API change or deprecation schedule warning.");
            }
            if (reasons.isEmpty()) {
                reasons.add(ImportanceReason.DEFAULT_BASELINE);
                evidence.add("Baseline importance checks executed.");
            }

            Map<String, Double> breakdown = new LinkedHashMap<>();
            breakdown.put(KEY_CATEGORY_WEIGHT, maxCategoryWeight);
            breakdown.put(KEY_FRESHNESS_BONUS, freshnessBonus);
            breakdown.put(KEY_OFFICIAL_RELEASE_BONUS, officialBonus);
            breakdown.put(KEY_ORG_DIVERSITY_BONUS, orgBonus);
            breakdown.put(KEY_MAJOR_RELEASE_BONUS, releaseBonus);
            breakdown.put(KEY_SECURITY_BONUS, securityBonus);
            breakdown.put(KEY_BREAKING_CHANGE_BONUS, breakingBonus);

            // Extension signals maps
            Map<String, Object> metadata = new LinkedHashMap<>();
            metadata.put("githubActivityPlaceholder", 0);
            metadata.put("hackerNewsScorePlaceholder", 0);
            metadata.put("redditActivityPlaceholder", 0);

            ImportanceAssessment assessment = ImportanceAssessment.builder()
                    .score(score)
                    .confidence(confidence)
                    .level(level)
                    .reasons(reasons)
                    .evidence(evidence)
                    .scoreBreakdown(breakdown)
                    .metadata(metadata)
                    .build();

            for (CredibilityAssessedUpdateDTO u : updates) {
                results.add(ImportanceAssessedUpdateDTO.builder()
                        .credibilityAssessedUpdate(u)
                        .assessment(assessment)
                        .build());
            }
        }

        long elapsed = System.currentTimeMillis() - startTime;
        double avgScore = totalScoreSum / groupedEvents.size();
        avgScore = Math.round(avgScore * 100.0) / 100.0;

        log.info("[ImportanceRankingAgent] [runId={}] [threadId={}] processed={} accepted={} elapsed={}ms [warnings=0 errors=0] averageScore={} criticalEvents={}",
                input.get(0).getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getFetchedAt(),
                threadId, input.size(), results.size(), elapsed, avgScore, criticalCount);

        return results;
    }

    private String extractOrgIndicator(String url) {
        if (url == null || url.isBlank()) {
            return "unknown";
        }
        try {
            URI uri = new URI(url);
            String host = uri.getHost();
            if (host == null) {
                return "unknown";
            }
            host = host.toLowerCase();
            if (host.startsWith("www.")) {
                host = host.substring(4);
            }
            String[] parts = host.split("\\.");
            if (parts.length > 1) {
                return parts[parts.length - 2];
            }
            return host;
        } catch (Exception e) {
            return "unknown";
        }
    }
}
