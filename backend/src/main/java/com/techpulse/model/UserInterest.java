package com.techpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * JPA Entity mapping dynamically-weighted interest profiles.
 */
@Entity
@Table(name = "user_interest")
@IdClass(UserInterestId.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInterest {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "interest_type", length = 50)
    private String interestType;

    @Id
    @Column(name = "interest_key", length = 255)
    private String interestKey;

    @Builder.Default
    @Column(name = "weight")
    private Double weight = 0.0;

    @Builder.Default
    @Column(name = "last_interaction_at")
    private LocalDateTime lastInteractionAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        lastInteractionAt = LocalDateTime.now();
    }
}
