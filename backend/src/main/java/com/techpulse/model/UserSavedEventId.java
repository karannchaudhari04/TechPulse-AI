package com.techpulse.model;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Composite ID class for UserSavedEvent entity.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSavedEventId implements Serializable {
    private Long userId;
    private String eventId;
}
