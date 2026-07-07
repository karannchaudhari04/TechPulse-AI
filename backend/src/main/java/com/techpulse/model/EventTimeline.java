package com.techpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * JPA Entity mapping chronological timeline points tracking product and library release lifecycles.
 */
@Entity
@Table(name = "event_timeline")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventTimeline {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "entity_name", nullable = false, length = 150)
    private String entityName;

    @Column(name = "event_id", nullable = false, length = 36)
    private String eventId;

    @Column(name = "lifecycle_type", nullable = false, length = 50)
    private String lifecycleType;

    @Column(name = "version", length = 50)
    private String version;

    @Column(name = "event_timestamp")
    private LocalDateTime eventTimestamp;
}
