package com.techpulse.model;

import com.techpulse.agent.model.SourceType;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * JPA entity representing raw text updates fetched by the Discovery Agent.
 */
@Entity
@Table(name = "raw_ingestion")
@Data
public class RawIngestion {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "run_id", nullable = false, length = 36)
    private String runId;

    @Column(name = "source_name", nullable = false, length = 150)
    private String sourceName;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 50)
    private SourceType sourceType;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String title;

    @Column(name = "raw_content", columnDefinition = "LONGTEXT", nullable = false)
    private String rawContent;

    @Column(nullable = false, length = 512)
    private String url;

    @Column(name = "canonical_url", length = 512)
    private String canonicalUrl;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "fetched_at")
    private LocalDateTime fetchedAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false, length = 50)
    private ProcessingStatus processingStatus = ProcessingStatus.NEW;

    @Column(name = "event_id", length = 36)
    private String eventId;

    @Column(name = "credibility_score")
    private Double credibilityScore = 0.0;

    @Column(name = "credibility_level", length = 50)
    private String credibilityLevel;

    @Column(name = "credibility_confidence")
    private Double credibilityConfidence = 0.0;

    @Column(name = "score_baseline")
    private Double scoreBaseline = 0.0;

    @Column(name = "score_official_bonus")
    private Double scoreOfficialBonus = 0.0;

    @Column(name = "score_agreement_bonus")
    private Double scoreAgreementBonus = 0.0;

    @Column(name = "score_clickbait_penalty")
    private Double scoreClickbaitPenalty = 0.0;

    @Column(name = "is_official")
    private Boolean isOfficial = false;

    public enum ProcessingStatus {
        NEW,
        CLEANED,
        CLASSIFIED,
        DUPLICATE,
        PROCESSED
    }
}
