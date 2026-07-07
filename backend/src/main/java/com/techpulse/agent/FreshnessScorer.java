package com.techpulse.agent;

import com.techpulse.model.TechnologyEvent;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Scorer applying exponential time decay based on event age.
 */
@Component
public class FreshnessScorer implements ScoringComponent {

    @Override
    public double calculate(TechnologyEvent event, Long userId) {
        LocalDateTime timestamp = event.getFirstSeen() != null ? event.getFirstSeen() : LocalDateTime.now();
        long hours = Math.max(0, Duration.between(timestamp, LocalDateTime.now()).toHours());
        return Math.exp(-0.05 * hours);
    }

    @Override
    public String getName() {
        return "freshnessScore";
    }
}
