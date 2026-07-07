package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.model.KgNode;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.KgNodeRepository;
import org.springframework.stereotype.Component;
import java.util.*;

/**
 * Scorer mapping event entities trend velocities.
 */
@Component
public class TrendScorer implements ScoringComponent {

    private final KgNodeRepository kgNodeRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TrendScorer(KgNodeRepository kgNodeRepository) {
        this.kgNodeRepository = kgNodeRepository;
    }

    @Override
    public double calculate(TechnologyEvent event, Long userId) {
        if (event.getEntitiesJson() == null) return 0.0;

        List<?> entities = new ArrayList<>();
        try {
            entities = objectMapper.readValue(event.getEntitiesJson(), List.class);
        } catch (Exception ignored) {}

        if (entities.isEmpty()) return 0.0;

        double maxTrend = 0.0;
        for (Object entObj : entities) {
            String ent = String.valueOf(entObj);
            String norm = ent.toLowerCase().replaceAll("[\\s\\-_]", "");
            Optional<KgNode> nodeOpt = kgNodeRepository.findByNormalizedName(norm);
            if (nodeOpt.isPresent()) {
                maxTrend = Math.max(maxTrend, nodeOpt.get().getTrendScore());
            }
        }
        return Math.min(1.0, maxTrend / 10.0);
    }

    @Override
    public String getName() {
        return "trendScore";
    }
}
