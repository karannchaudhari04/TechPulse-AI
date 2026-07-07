package com.techpulse.agent;

import com.techpulse.model.TechnologyEvent;
import org.springframework.stereotype.Component;

/**
 * Scorer mapping static event importance scores.
 */
@Component
public class ImportanceScorer implements ScoringComponent {

    @Override
    public double calculate(TechnologyEvent event, Long userId) {
        return event.getImportanceScore() != null ? event.getImportanceScore() : 0.0;
    }

    @Override
    public String getName() {
        return "importanceScore";
    }
}
