package com.techpulse.agent;

import com.techpulse.model.TechnologyEvent;
import org.springframework.stereotype.Component;

/**
 * Scorer mapping static event credibility scores.
 */
@Component
public class CredibilityScorer implements ScoringComponent {

    @Override
    public double calculate(TechnologyEvent event, Long userId) {
        return event.getCredibilityScore() != null ? event.getCredibilityScore() : 0.0;
    }

    @Override
    public String getName() {
        return "credibilityScore";
    }
}
