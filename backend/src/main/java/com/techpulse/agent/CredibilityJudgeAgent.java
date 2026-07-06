package com.techpulse.agent;

import com.techpulse.agent.config.CredibilityProperties;
import com.techpulse.agent.dto.*;
import com.techpulse.agent.model.CredibilityLevel;
import com.techpulse.agent.model.CredibilityReason;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.*;

/**
 * Agent responsible for assessing event credibility, official vendor announcements,
 * cross-source organization agreement, and clickbait/spam indicators.
 */
@Service
public class CredibilityJudgeAgent implements Agent<List<ValidatedUpdateDTO>, List<CredibilityAssessedUpdateDTO>> {

    private static final Logger log = LoggerFactory.getLogger(CredibilityJudgeAgent.class);

    private final CredibilityProperties credibilityProperties;

    public CredibilityJudgeAgent(CredibilityProperties credibilityProperties) {
        this.credibilityProperties = credibilityProperties;
    }

    @Override
    public List<CredibilityAssessedUpdateDTO> process(List<ValidatedUpdateDTO> input) {
        if (input == null || input.isEmpty()) {
            return Collections.emptyList();
        }

        long startTime = System.currentTimeMillis();
        long threadId = Thread.currentThread().getId();

        // 1. Group updates by event ID
        Map<String, List<ValidatedUpdateDTO>> groupedEvents = new HashMap<>();
        for (ValidatedUpdateDTO dto : input) {
            groupedEvents.computeIfAbsent(dto.getEventId(), k -> new ArrayList<>()).add(dto);
        }

        List<CredibilityAssessedUpdateDTO> assessedResults = new ArrayList<>();

        for (Map.Entry<String, List<ValidatedUpdateDTO>> entry : groupedEvents.entrySet()) {
            String eventId = entry.getKey();
            List<ValidatedUpdateDTO> updates = entry.getValue();

            // 2. Extract unique organization identifiers
            Set<String> uniqueOrgs = new HashSet<>();
            for (ValidatedUpdateDTO u : updates) {
                String org = extractOrgIndicator(u.getClassifiedUpdate().getCleanedUpdate().getCanonicalUrl());
                uniqueOrgs.add(org);
            }
            int orgCount = uniqueOrgs.size();

            // 3. Evaluate baseline weight and official status
            double maxBaseline = 0.70;
            boolean isOfficial = false;
            String leadOrganization = "Unknown Source";

            for (String org : uniqueOrgs) {
                CredibilityProperties.SourceMetadata metadata = credibilityProperties.getSources() != null
                        ? credibilityProperties.getSources().get(org.toLowerCase())
                        : null;

                if (metadata != null) {
                    if (metadata.getBaselineWeight() > maxBaseline) {
                        maxBaseline = metadata.getBaselineWeight();
                        leadOrganization = metadata.getOrganization();
                    }
                    if (metadata.isOfficial()) {
                        isOfficial = true;
                    }
                } else {
                    if (isDomainPatternOfficial(org)) {
                        isOfficial = true;
                        maxBaseline = 1.0;
                        leadOrganization = org.substring(0, 1).toUpperCase() + org.substring(1);
                    }
                }
            }

            // 4. Calculate bonuses
            double officialBonus = isOfficial ? 0.15 : 0.0;
            double agreementBonus = Math.min(0.20, (orgCount - 1) * 0.05);

            // 5. Calculate clickbait penalties
            double maxClickbaitPenalty = 0.0;
            List<CredibilityReason> reasons = new ArrayList<>();
            List<String> evidence = new ArrayList<>();

            for (ValidatedUpdateDTO u : updates) {
                CleanedUpdateDTO clean = u.getClassifiedUpdate().getCleanedUpdate();
                String title = clean.getTitle();
                String content = clean.getCleanedContent();
                double currentPenalty = 0.0;

                // Penalty 1: All CAPS
                if (title.equals(title.toUpperCase()) && title.length() > 5) {
                    currentPenalty += 0.15;
                    if (!reasons.contains(CredibilityReason.CLICKBAIT_PUNCTUATION)) {
                        reasons.add(CredibilityReason.CLICKBAIT_PUNCTUATION);
                        evidence.add("Title contains ALL CAPS characters");
                    }
                }

                // Penalty 2: Excessive exclamation marks
                if (title.contains("!!") || title.contains("! !")) {
                    currentPenalty += 0.10;
                    if (!reasons.contains(CredibilityReason.CLICKBAIT_PUNCTUATION)) {
                        reasons.add(CredibilityReason.CLICKBAIT_PUNCTUATION);
                        evidence.add("Title contains multiple exclamation marks");
                    }
                }

                // Penalty 3: Clickbait keywords
                if (credibilityProperties.getClickbaitKeywords() != null) {
                    for (String kw : credibilityProperties.getClickbaitKeywords()) {
                        if (title.toLowerCase().contains(kw.toLowerCase())) {
                            currentPenalty += 0.20;
                            if (!reasons.contains(CredibilityReason.SPAMMY_KEYWORDS)) {
                                reasons.add(CredibilityReason.SPAMMY_KEYWORDS);
                                evidence.add("Title contains clickbait keyword: " + kw);
                            }
                            break;
                        }
                    }
                }

                // Penalty 4: Extremely short description
                int wordCount = content.trim().split("\\s+").length;
                if (wordCount < 20) {
                    currentPenalty += 0.10;
                    if (!reasons.contains(CredibilityReason.SHORT_CONTENT)) {
                        reasons.add(CredibilityReason.SHORT_CONTENT);
                        evidence.add("Content is too brief (" + wordCount + " words)");
                    }
                }

                maxClickbaitPenalty = Math.max(maxClickbaitPenalty, currentPenalty);
            }

            // 6. Aggregate score
            double score = maxBaseline + officialBonus + agreementBonus - maxClickbaitPenalty;
            score = Math.max(0.0, Math.min(1.0, score));
            score = Math.round(score * 100.0) / 100.0;

            // 7. Calculate confidence
            double confidence = isOfficial ? 1.0 : Math.min(1.0, 0.5 + 0.15 * orgCount);
            confidence = Math.round(confidence * 100.0) / 100.0;

            // 8. Assign Credibility Level
            CredibilityLevel level = CredibilityLevel.MEDIUM;
            if (score >= 0.90) {
                level = CredibilityLevel.VERIFIED;
            } else if (score >= 0.75) {
                level = CredibilityLevel.HIGH;
            } else if (score >= 0.50) {
                level = CredibilityLevel.MEDIUM;
            } else {
                level = CredibilityLevel.LOW;
            }

            // 9. Map reasons
            if (isOfficial) {
                reasons.add(CredibilityReason.OFFICIAL_SOURCE);
                evidence.add("Verified official source from organization: " + leadOrganization);
            }
            if (orgCount > 1) {
                reasons.add(CredibilityReason.CROSS_SOURCE_CONSENSUS);
                evidence.add("Consensus achieved across " + orgCount + " independent organizations.");
            }
            if (reasons.isEmpty()) {
                reasons.add(CredibilityReason.DEFAULT_FALLBACK);
                evidence.add("Baseline validation successfully applied.");
            }

            CredibilityAssessment assessment = CredibilityAssessment.builder()
                    .score(score)
                    .confidence(confidence)
                    .official(isOfficial)
                    .level(level)
                    .reasons(reasons)
                    .evidence(evidence)
                    .baselineWeight(maxBaseline)
                    .officialBonus(officialBonus)
                    .agreementBonus(agreementBonus)
                    .clickbaitPenalty(maxClickbaitPenalty)
                    .additionalSignals(new HashMap<>())
                    .build();

            for (ValidatedUpdateDTO u : updates) {
                assessedResults.add(CredibilityAssessedUpdateDTO.builder()
                        .validatedUpdate(u)
                        .assessment(assessment)
                        .build());
            }
        }

        long elapsed = System.currentTimeMillis() - startTime;
        log.info("[CredibilityJudgeAgent] [runId={}] [threadId={}] processed={} accepted={} rejected=0 elapsed={}ms [warnings=0 errors=0]",
                input.get(0).getClassifiedUpdate().getCleanedUpdate().getFetchedAt(), threadId, input.size(), assessedResults.size(), elapsed);

        return assessedResults;
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

    private boolean isDomainPatternOfficial(String org) {
        String orgLower = org.toLowerCase();
        return orgLower.contains("microsoft") || orgLower.contains("amazon") ||
               orgLower.contains("google") || orgLower.contains("github") ||
               orgLower.contains("apple");
    }
}
