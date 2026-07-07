package com.techpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * JPA Entity mapping explicitly followed entities (technologies, frameworks, companies, versions).
 */
@Entity
@Table(name = "user_follow", uniqueConstraints = {
    @UniqueConstraint(name = "uq_user_follow_entity", columnNames = {"user_id", "entity_name", "entity_type"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserFollow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "entity_name", nullable = false, length = 255)
    private String entityName;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Builder.Default
    @Column(name = "followed_at")
    private LocalDateTime followedAt = LocalDateTime.now();
}
