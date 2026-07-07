package com.techpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * JPA Entity mapping user saved/bookmarked technology events.
 */
@Entity
@Table(name = "user_saved_event")
@IdClass(UserSavedEventId.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSavedEvent {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "event_id", length = 36)
    private String eventId;

    @Builder.Default
    @Column(name = "saved_at")
    private LocalDateTime savedAt = LocalDateTime.now();
}
