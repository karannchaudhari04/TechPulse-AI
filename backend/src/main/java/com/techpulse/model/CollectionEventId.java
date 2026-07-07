package com.techpulse.model;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Composite ID class for CollectionEvent entity.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CollectionEventId implements Serializable {
    private Long collectionId;
    private String eventId;
}
