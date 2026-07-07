package com.techpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * JPA Entity mapping nodes in the knowledge graph.
 */
@Entity
@Table(name = "kg_node")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KgNode {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "name", unique = true, nullable = false, length = 150)
    private String name;

    @Column(name = "normalized_name", unique = true, nullable = false, length = 150)
    private String normalizedName;

    @Column(name = "type", nullable = false, length = 50)
    private String type;

    @Builder.Default
    @Column(name = "mention_count")
    private Integer mentionCount = 1;

    @Builder.Default
    @Column(name = "trend_score")
    private Double trendScore = 0.0;

    @Builder.Default
    @Column(name = "trend_label", length = 50)
    private String trendLabel = "Stable";

    @Builder.Default
    @Column(name = "last_seen")
    private LocalDateTime lastSeen = LocalDateTime.now();

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
