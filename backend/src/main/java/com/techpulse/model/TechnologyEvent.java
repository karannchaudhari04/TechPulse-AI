package com.techpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * JPA Entity mapping unified technology events, holding categories, scores, versions, and AI synthesis.
 */
@Entity
@Table(name = "technology_event")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TechnologyEvent {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "categories_json", columnDefinition = "TEXT")
    private String categoriesJson;

    @Builder.Default
    @Column(name = "credibility_score")
    private Double credibilityScore = 0.0;

    @Builder.Default
    @Column(name = "importance_score")
    private Double importanceScore = 0.0;

    @Builder.Default
    @Column(name = "merge_confidence")
    private Double mergeConfidence = 1.0;

    @Column(name = "first_seen")
    private LocalDateTime firstSeen;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @Column(name = "lifecycle_status", length = 50)
    private String lifecycleStatus;

    @Column(name = "major_version")
    private Integer majorVersion;

    @Column(name = "minor_version")
    private Integer minorVersion;

    @Column(name = "patch_version")
    private Integer patchVersion;

    @Column(name = "version_string", length = 50)
    private String versionString;

    @Column(name = "entities_json", columnDefinition = "TEXT")
    private String entitiesJson;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "technical_impact", columnDefinition = "TEXT")
    private String technicalImpact;

    @Column(name = "developer_impact", columnDefinition = "TEXT")
    private String developerImpact;

    @Column(name = "enterprise_impact", columnDefinition = "TEXT")
    private String enterpriseImpact;

    @Column(name = "migration_notes", columnDefinition = "TEXT")
    private String migrationNotes;

    @Column(name = "breaking_changes", columnDefinition = "TEXT")
    private String breakingChanges;

    @Column(name = "security_notes", columnDefinition = "TEXT")
    private String securityNotes;

    @Column(name = "official_links_json", columnDefinition = "TEXT")
    private String officialLinksJson;

    @Column(name = "llm_model", length = 50)
    private String llmModel;

    @Column(name = "prompt_version", length = 50)
    private String promptVersion;

    @Column(name = "response_schema_version", length = 50)
    private String responseSchemaVersion;

    @Builder.Default
    @Column(name = "summary_status", length = 50)
    private String summaryStatus = "NEW";

    @Builder.Default
    @Column(name = "prompt_tokens")
    private Integer promptTokens = 0;

    @Builder.Default
    @Column(name = "completion_tokens")
    private Integer completionTokens = 0;

    @Builder.Default
    @Column(name = "estimated_cost_usd")
    private Double estimatedCostUsd = 0.0;

    @Builder.Default
    @Column(name = "estimated_cost_inr")
    private Double estimatedCostInr = 0.0;

    @Builder.Default
    @Column(name = "generation_latency")
    private Integer generationLatency = 0;

    @Column(name = "summary_generated_at")
    private LocalDateTime summaryGeneratedAt;
}
