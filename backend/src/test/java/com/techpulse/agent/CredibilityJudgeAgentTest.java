package com.techpulse.agent;

import com.techpulse.agent.config.CredibilityProperties;
import com.techpulse.agent.dto.*;
import com.techpulse.agent.model.CredibilityLevel;
import com.techpulse.agent.model.CredibilityReason;
import com.techpulse.agent.model.SourceType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test validating source baselines, official status, clickbait/spam indicators,
 * and cross-source agreement calculations.
 */
public class CredibilityJudgeAgentTest {

    private CredibilityJudgeAgent credibilityJudgeAgent;

    @BeforeEach
    public void setUp() {
        CredibilityProperties props = new CredibilityProperties();
        Map<String, CredibilityProperties.SourceMetadata> sources = new HashMap<>();
        
        CredibilityProperties.SourceMetadata tc = new CredibilityProperties.SourceMetadata();
        tc.setOrganization("TechCrunch");
        tc.setType("TIER_1_TECH_NEWS");
        tc.setBaselineWeight(0.90);
        tc.setOfficial(false);
        sources.put("techcrunch", tc);

        CredibilityProperties.SourceMetadata gh = new CredibilityProperties.SourceMetadata();
        gh.setOrganization("GitHub");
        gh.setType("OFFICIAL_VENDOR");
        gh.setBaselineWeight(1.0);
        gh.setOfficial(true);
        sources.put("github", gh);

        props.setSources(sources);
        props.setClickbaitKeywords(List.of("shocking", "secret"));

        credibilityJudgeAgent = new CredibilityJudgeAgent(props);
    }

    @Test
    public void testOfficialVendorHighCredibility() {
        CleanedUpdateDTO clean = CleanedUpdateDTO.builder()
                .title("New Codespaces Feature")
                .cleanedContent("We released a brand new codespaces environment feature today for developers.")
                .sourceUrl("http://github.blog/codespaces")
                .canonicalUrl("http://github.blog/codespaces")
                .publishedAt(LocalDateTime.now())
                .fetchedAt(LocalDateTime.now())
                .sourceType(SourceType.RSS)
                .build();

        ClassifiedUpdateDTO classified = ClassifiedUpdateDTO.builder()
                .cleanedUpdate(clean)
                .categoryConfidences(new HashMap<>())
                .build();

        ValidatedUpdateDTO validated = ValidatedUpdateDTO.builder()
                .classifiedUpdate(classified)
                .eventId("event-1")
                .isDuplicate(false)
                .matchScore(0.0)
                .matchReason("NEW")
                .build();

        List<CredibilityAssessedUpdateDTO> result = credibilityJudgeAgent.process(List.of(validated));

        assertEquals(1, result.size());
        CredibilityAssessment assessment = result.get(0).getAssessment();
        assertEquals(1.0, assessment.getScore());
        assertTrue(assessment.isOfficial());
        assertEquals(CredibilityLevel.VERIFIED, assessment.getLevel());
        assertTrue(assessment.getReasons().contains(CredibilityReason.OFFICIAL_SOURCE));
    }

    @Test
    public void testClickbaitPenalties() {
        CleanedUpdateDTO clean = CleanedUpdateDTO.builder()
                .title("THIS SHOCKING NEW EXPLOIT WILL DESTROY YOUR SYSTEM!!")
                .cleanedContent("Short text.")
                .sourceUrl("http://techcrunch.com/exploit")
                .canonicalUrl("http://techcrunch.com/exploit")
                .publishedAt(LocalDateTime.now())
                .fetchedAt(LocalDateTime.now())
                .sourceType(SourceType.RSS)
                .build();

        ClassifiedUpdateDTO classified = ClassifiedUpdateDTO.builder()
                .cleanedUpdate(clean)
                .categoryConfidences(new HashMap<>())
                .build();

        ValidatedUpdateDTO validated = ValidatedUpdateDTO.builder()
                .classifiedUpdate(classified)
                .eventId("event-2")
                .isDuplicate(false)
                .matchScore(0.0)
                .matchReason("NEW")
                .build();

        List<CredibilityAssessedUpdateDTO> result = credibilityJudgeAgent.process(List.of(validated));

        assertEquals(1, result.size());
        CredibilityAssessment assessment = result.get(0).getAssessment();
        
        // Baseline 0.90
        // Clickbait penalty: 0.15 (ALL CAPS) + 0.10 (!!) + 0.20 (shocking) + 0.10 (short content) = 0.55
        // Expected score: 0.90 - 0.55 = 0.35
        assertEquals(0.35, assessment.getScore());
        assertEquals(CredibilityLevel.LOW, assessment.getLevel());
        assertTrue(assessment.getReasons().contains(CredibilityReason.CLICKBAIT_PUNCTUATION));
        assertTrue(assessment.getReasons().contains(CredibilityReason.SPAMMY_KEYWORDS));
        assertTrue(assessment.getReasons().contains(CredibilityReason.SHORT_CONTENT));
    }

    @Test
    public void testCrossSourceAgreementBonus() {
        CleanedUpdateDTO clean1 = CleanedUpdateDTO.builder()
                .title("Startup Raises Funding")
                .cleanedContent("Tech startup raised millions in latest funding round led by top VCs. This is additional padding text to ensure the word count exceeds twenty words to avoid clickbait penalties.")
                .sourceUrl("http://techcrunch.com/funding")
                .canonicalUrl("http://techcrunch.com/funding")
                .publishedAt(LocalDateTime.now())
                .fetchedAt(LocalDateTime.now())
                .sourceType(SourceType.RSS)
                .build();

        CleanedUpdateDTO clean2 = CleanedUpdateDTO.builder()
                .title("Startup Raises Funding")
                .cleanedContent("Tech startup raised millions in latest funding round led by top VCs. This is additional padding text to ensure the word count exceeds twenty words to avoid clickbait penalties.")
                .sourceUrl("http://venturebeat.com/funding")
                .canonicalUrl("http://venturebeat.com/funding")
                .publishedAt(LocalDateTime.now())
                .fetchedAt(LocalDateTime.now())
                .sourceType(SourceType.RSS)
                .build();

        ClassifiedUpdateDTO c1 = ClassifiedUpdateDTO.builder().cleanedUpdate(clean1).categoryConfidences(new HashMap<>()).build();
        ClassifiedUpdateDTO c2 = ClassifiedUpdateDTO.builder().cleanedUpdate(clean2).categoryConfidences(new HashMap<>()).build();

        ValidatedUpdateDTO val1 = ValidatedUpdateDTO.builder().classifiedUpdate(c1).eventId("event-3").isDuplicate(false).build();
        ValidatedUpdateDTO val2 = ValidatedUpdateDTO.builder().classifiedUpdate(c2).eventId("event-3").isDuplicate(true).build();

        List<CredibilityAssessedUpdateDTO> result = credibilityJudgeAgent.process(List.of(val1, val2));

        assertEquals(2, result.size());
        CredibilityAssessment assessment = result.get(0).getAssessment();
        
        // Max Baseline 0.90
        // Org Count = 2 -> Agreement bonus = +0.05
        // Expected score: 0.90 + 0.05 = 0.95
        assertEquals(0.95, assessment.getScore());
        assertEquals(CredibilityLevel.VERIFIED, assessment.getLevel());
        assertTrue(assessment.getReasons().contains(CredibilityReason.CROSS_SOURCE_CONSENSUS));
    }
}
