package com.techpulse.agent;

import com.techpulse.agent.dto.PromptContext;
import com.techpulse.model.EventTimeline;
import com.techpulse.model.KgEdge;
import com.techpulse.model.KgNode;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.EventTimelineRepository;
import com.techpulse.repository.KgEdgeRepository;
import com.techpulse.repository.KgNodeRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Factory class generating structured prompt contexts from TechnologyEvent repository states.
 */
@Service
public class PromptContextFactory {

    private final EventTimelineRepository eventTimelineRepository;
    private final KgNodeRepository kgNodeRepository;
    private final KgEdgeRepository kgEdgeRepository;

    public PromptContextFactory(EventTimelineRepository eventTimelineRepository,
                                KgNodeRepository kgNodeRepository,
                                KgEdgeRepository kgEdgeRepository) {
        this.eventTimelineRepository = eventTimelineRepository;
        this.kgNodeRepository = kgNodeRepository;
        this.kgEdgeRepository = kgEdgeRepository;
    }

    /**
     * Resolves timeline milestones, entities, graph edges, and trends to build a PromptContext.
     */
    public PromptContext createContext(TechnologyEvent event) {
        List<EventTimeline> timelines = eventTimelineRepository.findAll().stream()
                .filter(t -> t.getEventId().equals(event.getId()))
                .sorted(Comparator.comparing(EventTimeline::getEventTimestamp))
                .toList();

        String timelineStr = timelines.stream()
                .map(t -> String.format("[%s] Entity: %s, Version: %s, Lifecycle: %s",
                        t.getEventTimestamp(), t.getEntityName(), t.getVersion(), t.getLifecycleType()))
                .collect(Collectors.joining("; "));

        if (timelineStr.isEmpty()) {
            timelineStr = "Not confirmed.";
        }

        String graphStr = "Not confirmed.";
        if (event.getEntitiesJson() != null) {
            List<KgNode> allNodes = kgNodeRepository.findAll();
            List<String> eventEntityNames = new ArrayList<>();
            try {
                String clean = event.getEntitiesJson().replace("[", "").replace("]", "").replace("\"", "");
                if (!clean.trim().isEmpty()) {
                    List<String> parsed = Arrays.stream(clean.split(","))
                            .map(String::trim)
                            .toList();
                    eventEntityNames.addAll(parsed);
                }
            } catch (Exception ignored) {}

            List<String> nodeIds = allNodes.stream()
                    .filter(n -> eventEntityNames.contains(n.getName()))
                    .map(KgNode::getId)
                    .toList();

            if (!nodeIds.isEmpty()) {
                List<KgEdge> edges = kgEdgeRepository.findAll().stream()
                        .filter(e -> nodeIds.contains(e.getSourceNodeId()) || nodeIds.contains(e.getTargetNodeId()))
                        .toList();

                graphStr = edges.stream()
                        .map(e -> {
                            Optional<KgNode> source = allNodes.stream().filter(n -> n.getId().equals(e.getSourceNodeId())).findFirst();
                            Optional<KgNode> target = allNodes.stream().filter(n -> n.getId().equals(e.getTargetNodeId())).findFirst();
                            String srcName = source.map(KgNode::getName).orElse("Unknown");
                            String tgtName = target.map(KgNode::getName).orElse("Unknown");
                            return String.format("%s %s %s (confidence: %.2f)", srcName, e.getRelationType(), tgtName, e.getConfidence());
                        })
                        .collect(Collectors.joining("; "));
            }
        }
        if (graphStr.isEmpty()) {
            graphStr = "Not confirmed.";
        }

        String trendStr = "Stable";
        if (event.getEntitiesJson() != null) {
            List<String> eventEntityNames = new ArrayList<>();
            try {
                String clean = event.getEntitiesJson().replace("[", "").replace("]", "").replace("\"", "");
                if (!clean.trim().isEmpty()) {
                    List<String> parsed = Arrays.stream(clean.split(","))
                            .map(String::trim)
                            .toList();
                    eventEntityNames.addAll(parsed);
                }
            } catch (Exception ignored) {}

            if (!eventEntityNames.isEmpty()) {
                String primary = eventEntityNames.get(0);
                Optional<KgNode> node = kgNodeRepository.findByNormalizedName(primary.toLowerCase().replaceAll("[\\s\\-_]", ""));
                if (node.isPresent()) {
                    trendStr = String.format("%s (score: %.2f)", node.get().getTrendLabel(), node.get().getTrendScore());
                }
            }
        }

        return PromptContext.builder()
                .title(event.getTitle())
                .version(event.getVersionString() != null ? event.getVersionString() : "Not confirmed.")
                .categories(event.getCategoriesJson() != null ? event.getCategoriesJson() : "[]")
                .credibilityScore(String.valueOf(event.getCredibilityScore()))
                .importanceScore(String.valueOf(event.getImportanceScore()))
                .timeline(timelineStr)
                .graph(graphStr)
                .trend(trendStr)
                .entities(event.getEntitiesJson() != null ? event.getEntitiesJson() : "[]")
                .build();
    }
}
