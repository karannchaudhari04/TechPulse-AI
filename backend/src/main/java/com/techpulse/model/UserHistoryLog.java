package com.techpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_history_log", uniqueConstraints = {
    @UniqueConstraint(name = "uq_user_event_history", columnNames = {"user_id", "event_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserHistoryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "event_id", nullable = false, length = 36)
    private String eventId;

    @Builder.Default
    @Column(name = "last_opened")
    private LocalDateTime lastOpened = LocalDateTime.now();

    @Builder.Default
    @Column(name = "reading_duration_sec")
    private Integer readingDurationSec = 0;

    @Builder.Default
    @Column(name = "completion_percentage")
    private Integer completionPercentage = 0;
}
