package com.techpulse.agent;

import com.techpulse.model.TechnologyEvent;

/**
 * Interface representing a modular recommendation scoring component.
 */
public interface ScoringComponent {
    double calculate(TechnologyEvent event, Long userId);
    String getName();
}
