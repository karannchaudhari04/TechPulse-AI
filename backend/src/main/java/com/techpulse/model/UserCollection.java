package com.techpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * JPA Entity mapping user-created bookmarks folders and collections.
 */
@Entity
@Table(name = "user_collection")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserCollection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 500)
    private String description;

    @Builder.Default
    @Column(name = "is_auto_updating")
    private Boolean isAutoUpdating = false;

    @Column(name = "query_criteria_json", columnDefinition = "TEXT")
    private String queryCriteriaJson;

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
