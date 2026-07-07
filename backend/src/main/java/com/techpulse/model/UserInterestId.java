package com.techpulse.model;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Composite ID class for UserInterest entity.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserInterestId implements Serializable {
    private Long userId;
    private String interestType;
    private String interestKey;
}
