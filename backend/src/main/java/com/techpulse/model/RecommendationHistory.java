package com.techpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * JPA Entity tracking recommendation history for CTR analytical feedback.
 */
@Entity
@Table(name = "recommendation_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "event_id", nullable = false, length = 36)
    private String eventId;

    @Column(nullable = false)
    private Double score;

    @Builder.Default
    @Column(name = "shown_at")
    private LocalDateTime shownAt = LocalDateTime.now();

    @Builder.Default
    @Column(name = "is_clicked")
    private Boolean isClicked = false;

    @Builder.Default
    @Column(name = "is_read")
    private Boolean isRead = false;
}
