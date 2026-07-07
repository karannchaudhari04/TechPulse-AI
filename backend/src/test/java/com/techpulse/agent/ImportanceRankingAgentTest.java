package com.techpulse.agent;

import com.techpulse.agent.config.ImportanceProperties;
import com.techpulse.agent.dto.*;
import com.techpulse.agent.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test verifying category weights, freshness thresholds, official/multiple org bonuses,
 * major release & security regex matching, and score bounding.
 */
public class ImportanceRankingAgentTest {

    private ImportanceRankingAgent importanceRankingAgent;

    @BeforeEach
    public void setUp() {
        ImportanceProperties props = new ImportanceProperties();

        Map<String, Double> categoryWeights = new HashMap<>();
        categoryWeights.put("AI", 1.00);
        categoryWeights.put("MOBILE", 0.65);
        categoryWeights.put("SYSTEM_DESIGN_BACKEND", 0.85);
        props.setCategoryWeights(categoryWeights);

        ImportanceProperties.FreshnessProperties freshness = new ImportanceProperties.FreshnessProperties();
        freshness.setFirstHour(0.25);
        freshness.setFirstDay(0.15);
        freshness.setFirstWeek(0.05);
        props.setFreshness(freshness);

        ImportanceProperties.BonusProperties bonuses = new ImportanceProperties.BonusProperties();
        bonuses.setOfficialRelease(0.15);
        bonuses.setMultipleOrganizations(0.10);
        bonuses.setMajorVersion(0.10);
        bonuses.setSecurity(0.15);
        bonuses.setBreakingChange(0.10);
        props.setBonuses(bonuses);

        importanceRankingAgent = new ImportanceRankingAgent(props);
    }

    @Test
    public void testImportanceScoringPipeline() {
        CleanedUpdateDTO clean = CleanedUpdateDTO.builder()
                .title("Spring Boot v3.2.0 Released GA")
                .cleanedContent("Critical RCE vulnerability fixed in zero-day exploit patch. Deprecation warning API Change.")
                .sourceUrl("http://github.blog/spring-boot")
                .canonicalUrl("http://github.blog/spring-boot")
                .publishedAt(LocalDateTime.now())
                .fetchedAt(LocalDateTime.now())
                .sourceType(SourceType.RSS)
                .build();

        ClassifiedUpdateDTO classified = ClassifiedUpdateDTO.builder()
                .cleanedUpdate(clean)
                .categoryConfidences(Map.of(CategoryType.SYSTEM_DESIGN_BACKEND, 1.0))
                .build();

        ValidatedUpdateDTO validated = ValidatedUpdateDTO.builder()
                .classifiedUpdate(classified)
                .eventId("event-1")
                .isDuplicate(false)
                .matchScore(0.0)
                .matchReason("NEW")
                .build();

        CredibilityAssessment credAssessment = CredibilityAssessment.builder()
                .score(1.0)
                .confidence(1.0)
                .official(true)
                .level(CredibilityLevel.VERIFIED)
                .reasons(List.of(CredibilityReason.OFFICIAL_SOURCE))
                .evidence(List.of("Official GitHub source"))
                .baselineWeight(1.0)
                .officialBonus(0.15)
                .agreementBonus(0.0)
                .clickbaitPenalty(0.0)
                .build();

        CredibilityAssessedUpdateDTO credibilityAssessed = CredibilityAssessedUpdateDTO.builder()
                .validatedUpdate(validated)
                .assessment(credAssessment)
                .build();

        List<ImportanceAssessedUpdateDTO> result = importanceRankingAgent.process(List.of(credibilityAssessed));

        assertEquals(1, result.size());
        ImportanceAssessment assessment = result.get(0).getAssessment();

        assertEquals(1.0, assessment.getScore());
        assertEquals(ImportanceLevel.CRITICAL, assessment.getLevel());
        assertEquals(1.0, assessment.getConfidence());

        assertTrue(assessment.getReasons().contains(ImportanceReason.HIGH_CATEGORY_WEIGHT));
        assertTrue(assessment.getReasons().contains(ImportanceReason.VERY_RECENT));
        assertTrue(assessment.getReasons().contains(ImportanceReason.OFFICIAL_RELEASE));
        assertTrue(assessment.getReasons().contains(ImportanceReason.MAJOR_RELEASE));
        assertTrue(assessment.getReasons().contains(ImportanceReason.SECURITY_UPDATE));
        assertTrue(assessment.getReasons().contains(ImportanceReason.BREAKING_CHANGE));
    }

    @Test
    public void testOrganizationAgreementBonusAndConfidence() {
        CleanedUpdateDTO clean1 = CleanedUpdateDTO.builder()
                .title("Kubernetes Security update")
                .cleanedContent("Kubernetes security announcement and patch release notes.")
                .sourceUrl("http://github.blog/kubernetes")
                .canonicalUrl("http://github.blog/kubernetes")
                .publishedAt(LocalDateTime.now().minusHours(10))
                .fetchedAt(LocalDateTime.now())
                .sourceType(SourceType.RSS)
                .build();

        CleanedUpdateDTO clean2 = CleanedUpdateDTO.builder()
                .title("Kubernetes Security update")
                .cleanedContent("Kubernetes security announcement and patch release notes.")
                .sourceUrl("http://techcrunch.com/kubernetes")
                .canonicalUrl("http://techcrunch.com/kubernetes")
                .publishedAt(LocalDateTime.now().minusHours(10))
                .fetchedAt(LocalDateTime.now())
                .sourceType(SourceType.RSS)
                .build();

        ClassifiedUpdateDTO c1 = ClassifiedUpdateDTO.builder().cleanedUpdate(clean1).categoryConfidences(Map.of(CategoryType.SYSTEM_DESIGN_BACKEND, 1.0)).build();
        ClassifiedUpdateDTO c2 = ClassifiedUpdateDTO.builder().cleanedUpdate(clean2).categoryConfidences(Map.of(CategoryType.SYSTEM_DESIGN_BACKEND, 1.0)).build();

        ValidatedUpdateDTO val1 = ValidatedUpdateDTO.builder().classifiedUpdate(c1).eventId("event-2").isDuplicate(false).build();
        ValidatedUpdateDTO val2 = ValidatedUpdateDTO.builder().classifiedUpdate(c2).eventId("event-2").isDuplicate(true).build();

        CredibilityAssessment cred1 = CredibilityAssessment.builder().score(0.90).confidence(0.90).official(false).level(CredibilityLevel.HIGH).reasons(List.of()).evidence(List.of()).build();
        CredibilityAssessment cred2 = CredibilityAssessment.builder().score(0.90).confidence(0.90).official(false).level(CredibilityLevel.HIGH).reasons(List.of()).evidence(List.of()).build();

        CredibilityAssessedUpdateDTO credUpdate1 = CredibilityAssessedUpdateDTO.builder().validatedUpdate(val1).assessment(cred1).build();
        CredibilityAssessedUpdateDTO credUpdate2 = CredibilityAssessedUpdateDTO.builder().validatedUpdate(val2).assessment(cred2).build();

        List<ImportanceAssessedUpdateDTO> result = importanceRankingAgent.process(List.of(credUpdate1, credUpdate2));

        assertEquals(2, result.size());
        ImportanceAssessment assessment = result.get(0).getAssessment();

        assertEquals(1.0, assessment.getScore());
        assertEquals(ImportanceLevel.CRITICAL, assessment.getLevel());
        assertEquals(0.90, assessment.getConfidence());
        assertTrue(assessment.getReasons().contains(ImportanceReason.MULTIPLE_ORGANIZATIONS));
    }
}
