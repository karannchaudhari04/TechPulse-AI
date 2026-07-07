package com.techpulse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * JPA Entity mapping events to collections.
 */
@Entity
@Table(name = "collection_event")
@IdClass(CollectionEventId.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectionEvent {

    @Id
    @Column(name = "collection_id")
    private Long collectionId;

    @Id
    @Column(name = "event_id", length = 36)
    private String eventId;

    @Builder.Default
    @Column(name = "added_at")
    private LocalDateTime addedAt = LocalDateTime.now();
}
