package com.techpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * JPA Entity mapping user-defined interests, topics, and difficulty levels.
 */
@Entity
@Table(name = "user_profile")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfile {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Builder.Default
    @Column(name = "preferred_difficulty_level", length = 50)
    private String preferredDifficultyLevel = "ALL";

    @Column(name = "categories_json", columnDefinition = "TEXT")
    private String categoriesJson;

    @Column(name = "technologies_json", columnDefinition = "TEXT")
    private String technologiesJson;

    @Column(name = "frameworks_json", columnDefinition = "TEXT")
    private String frameworksJson;

    @Column(name = "languages_json", columnDefinition = "TEXT")
    private String languagesJson;

    @Column(name = "cloud_providers_json", columnDefinition = "TEXT")
    private String cloudProvidersJson;

    @Column(name = "companies_json", columnDefinition = "TEXT")
    private String companiesJson;

    @Column(name = "products_json", columnDefinition = "TEXT")
    private String productsJson;

    @Column(name = "cves_json", columnDefinition = "TEXT")
    private String cvesJson;

    @Builder.Default
    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
