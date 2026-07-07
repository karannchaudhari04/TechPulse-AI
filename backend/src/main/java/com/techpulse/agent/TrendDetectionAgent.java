package com.techpulse.agent;

import com.techpulse.agent.dto.*;
import com.techpulse.model.KgNode;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.KgNodeRepository;
import com.techpulse.repository.TechnologyEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Agent responsible for evaluating trending parameters, growth velocities,
 * and mapping trend status labels over sliding windows.
 */
@Service
public class TrendDetectionAgent {

    private static final Logger log = LoggerFactory.getLogger(TrendDetectionAgent.class);

    private final KgNodeRepository kgNodeRepository;
    private final TechnologyEventRepository technologyEventRepository;

    public TrendDetectionAgent(KgNodeRepository kgNodeRepository, TechnologyEventRepository technologyEventRepository) {
        this.kgNodeRepository = kgNodeRepository;
        this.technologyEventRepository = technologyEventRepository;
    }

    /**
     * Recalculates trends across all entity nodes using growth rate and velocity metrics.
     */
    public List<TrendReportDTO> calculateTrends() {
        long startTime = System.currentTimeMillis();
        long threadId = Thread.currentThread().getId();

        List<KgNode> nodes = kgNodeRepository.findAll();
        List<TechnologyEvent> events = technologyEventRepository.findAll();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime t7d = now.minusDays(7);
        LocalDateTime t14d = now.minusDays(14);
        LocalDateTime t21d = now.minusDays(21);

        List<TrendReportDTO> reports = new ArrayList<>();

        for (KgNode node : nodes) {
            String name = node.getName();

            int currentCount = 0;
            int previousCount = 0;
            int prePrevCount = 0;

            double credibilitySum = 0.0;
            double importanceSum = 0.0;

            for (TechnologyEvent event : events) {
                if (event.getEntitiesJson() != null && event.getEntitiesJson().contains(name)) {
                    LocalDateTime time = event.getLastUpdated() != null ? event.getLastUpdated() : event.getFirstSeen();
                    if (time == null) continue;

                    if (time.isAfter(t7d)) {
                        currentCount++;
                        credibilitySum += event.getCredibilityScore();
                        importanceSum += event.getImportanceScore();
                    } else if (time.isAfter(t14d)) {
                        previousCount++;
                    } else if (time.isAfter(t21d)) {
                        prePrevCount++;
                    }
                }
            }

            double meanCred = currentCount > 0 ? credibilitySum / currentCount : 0.70;
            double meanImp = currentCount > 0 ? importanceSum / currentCount : 0.50;

            double growthRate = previousCount > 0 
                    ? (double) (currentCount - previousCount) / previousCount 
                    : (currentCount > 0 ? 1.0 : 0.0);

            double prevGrowthRate = prePrevCount > 0 
                    ? (double) (previousCount - prePrevCount) / prePrevCount 
                    : (previousCount > 0 ? 1.0 : 0.0);

            double velocity = growthRate - prevGrowthRate;

            double mentionWeight = Math.min(1.0, (double) currentCount / 50.0);
            double score = 0.25 * mentionWeight 
                    + 0.25 * Math.max(0.0, Math.min(1.0, growthRate))
                    + 0.25 * Math.max(0.0, Math.min(1.0, velocity))
                    + 0.125 * meanCred
                    + 0.125 * meanImp;

            score = Math.max(0.0, Math.min(1.0, score));
            score = Math.round(score * 100.0) / 100.0;

            String label = mapTrendLabel(score);

            node.setTrendScore(score);
            node.setTrendLabel(label);
            node.setLastSeen(now);
            kgNodeRepository.save(node);

            reports.add(TrendReportDTO.builder()
                    .entityName(name)
                    .type(node.getType())
                    .currentCount(currentCount)
                    .previousCount(previousCount)
                    .growthRate(Math.round(growthRate * 100.0) / 100.0)
                    .velocity(Math.round(velocity * 100.0) / 100.0)
                    .trendScore(score)
                    .trendLabel(label)
                    .build());
        }

        reports.sort(Comparator.comparingDouble(TrendReportDTO::getTrendScore).reversed());

        long elapsed = System.currentTimeMillis() - startTime;
        log.info("[TrendDetectionAgent] [runId=trends] [threadId={}] processed={} accepted={} elapsed={}ms [warnings=0 errors=0]",
                threadId, nodes.size(), reports.size(), elapsed);

        return reports;
    }

    private String mapTrendLabel(double score) {
        if (score >= 0.85) {
            return "Exploding";
        } else if (score >= 0.70) {
            return "Rising";
        } else if (score >= 0.50) {
            return "Stable";
        } else if (score >= 0.30) {
            return "Cooling";
        } else if (score >= 0.15) {
            return "Declining";
        }
        return "Dormant";
    }
}
