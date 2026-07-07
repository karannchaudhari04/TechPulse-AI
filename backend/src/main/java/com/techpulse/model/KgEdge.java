package com.techpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * JPA Entity mapping typed relationships between knowledge graph nodes with confidence scores.
 */
@Entity
@Table(name = "kg_edge", uniqueConstraints = @UniqueConstraint(columnNames = {"source_node_id", "target_node_id", "relation_type"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KgEdge {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "source_node_id", nullable = false, length = 36)
    private String sourceNodeId;

    @Column(name = "target_node_id", nullable = false, length = 36)
    private String targetNodeId;

    @Column(name = "relation_type", nullable = false, length = 50)
    private String relationType;

    @Builder.Default
    @Column(name = "weight")
    private Double weight = 1.0;

    @Builder.Default
    @Column(name = "confidence")
    private Double confidence = 0.5;

    @Builder.Default
    @Column(name = "evidence_count")
    private Integer evidenceCount = 1;

    @Column(name = "supporting_urls", columnDefinition = "TEXT")
    private String supportingUrls;

    @Builder.Default
    @Column(name = "last_seen")
    private LocalDateTime lastSeen = LocalDateTime.now();
}
