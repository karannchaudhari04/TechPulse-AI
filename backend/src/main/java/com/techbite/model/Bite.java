package com.techbite.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "bites", indexes = {
    @Index(name = "idx_category_status_published", columnList = "category_id, status, published_at"),
    @Index(name = "idx_status_published", columnList = "status, published_at")
})
@Getter
@Setter
@NoArgsConstructor
public class Bite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(name = "content_summary", nullable = false, columnDefinition = "TEXT")
    private String contentSummary;

    @Column(name = "original_source_url", nullable = false, length = 500)
    private String originalSourceUrl;

    @Column(name = "author_attribution", length = 150)
    private String authorAttribution;

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT'")
    private Status status = Status.DRAFT;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Status {
        DRAFT, PUBLISHED, ARCHIVED
    }
}
