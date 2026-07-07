package com.techpulse.agent;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.dto.*;
import com.techpulse.model.KgEdge;
import com.techpulse.model.KgNode;
import com.techpulse.repository.KgEdgeRepository;
import com.techpulse.repository.KgNodeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Service managing relationship discoveries and knowledge graph insertions.
 * Implements Entity Alias Resolution and Incremental Edge Confidence scoring.
 */
@Service
public class RelationshipEngine {

    private static final Logger log = LoggerFactory.getLogger(RelationshipEngine.class);

    private final KgNodeRepository kgNodeRepository;
    private final KgEdgeRepository kgEdgeRepository;
    private final ObjectMapper objectMapper;

    public RelationshipEngine(KgNodeRepository kgNodeRepository, KgEdgeRepository kgEdgeRepository) {
        this.kgNodeRepository = kgNodeRepository;
        this.kgEdgeRepository = kgEdgeRepository;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Maps nodes and updates edge mappings inside the Knowledge Graph.
     */
    public void buildRelationships(TechnologyEventDTO eventDto) {
        List<EntityExtractedUpdateDTO> updates = eventDto.getSupportingUpdates();
        if (updates == null || updates.isEmpty()) {
            return;
        }

        Map<String, KgNode> resolvedNodes = new LinkedHashMap<>();
        for (EntityExtractedUpdateDTO update : updates) {
            for (EntityExtractedUpdateDTO.ExtractedEntity entity : update.getEntities()) {
                String norm = normalizeString(entity.getName());
                resolvedNodes.computeIfAbsent(norm, k -> upsertNode(entity));
            }
        }

        List<KgNode> nodesList = new ArrayList<>(resolvedNodes.values());
        for (int i = 0; i < nodesList.size(); i++) {
            for (int j = i + 1; j < nodesList.size(); j++) {
                KgNode nodeA = nodesList.get(i);
                KgNode nodeB = nodesList.get(j);

                String relation = determineRelation(nodeA, nodeB, updates);
                String sourceId = nodeA.getId();
                String targetId = nodeB.getId();

                Set<String> urls = new HashSet<>();
                for (EntityExtractedUpdateDTO u : updates) {
                    urls.add(u.getImportanceAssessedUpdate().getCredibilityAssessedUpdate().getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate().getSourceUrl());
                }

                upsertEdge(sourceId, targetId, relation, urls);
            }
        }
    }

    private KgNode upsertNode(EntityExtractedUpdateDTO.ExtractedEntity entity) {
        String norm = normalizeString(entity.getName());
        Optional<KgNode> existing = kgNodeRepository.findByNormalizedName(norm);

        if (existing.isPresent()) {
            KgNode node = existing.get();
            node.setMentionCount(node.getMentionCount() + 1);
            node.setLastSeen(LocalDateTime.now());
            return kgNodeRepository.save(node);
        } else {
            KgNode node = KgNode.builder()
                    .id(UUID.randomUUID().toString())
                    .name(entity.getName())
                    .normalizedName(norm)
                    .type(entity.getType())
                    .mentionCount(1)
                    .trendScore(0.0)
                    .trendLabel("Stable")
                    .lastSeen(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .build();
            return kgNodeRepository.save(node);
        }
    }

    private void upsertEdge(String sourceId, String targetId, String relation, Set<String> urls) {
        Optional<KgEdge> existing = kgEdgeRepository.findBySourceNodeIdAndTargetNodeIdAndRelationType(sourceId, targetId, relation);

        if (existing.isPresent()) {
            KgEdge edge = existing.get();
            edge.setWeight(edge.getWeight() + 1.0);
            
            double conf = Math.min(1.0, edge.getConfidence() + 0.10);
            edge.setConfidence(conf);
            edge.setEvidenceCount(edge.getEvidenceCount() + 1);
            edge.setLastSeen(LocalDateTime.now());

            Set<String> mergedUrls = new HashSet<>();
            if (edge.getSupportingUrls() != null) {
                try {
                    List<String> list = objectMapper.readValue(edge.getSupportingUrls(), new TypeReference<List<String>>() {});
                    mergedUrls.addAll(list);
                } catch (Exception ignored) {}
            }
            mergedUrls.addAll(urls);

            try {
                edge.setSupportingUrls(objectMapper.writeValueAsString(mergedUrls));
            } catch (Exception ignored) {}

            kgEdgeRepository.save(edge);
        } else {
            String urlsJson = "";
            try {
                urlsJson = objectMapper.writeValueAsString(urls);
            } catch (Exception ignored) {}

            KgEdge edge = KgEdge.builder()
                    .id(UUID.randomUUID().toString())
                    .sourceNodeId(sourceId)
                    .targetNodeId(targetId)
                    .relationType(relation)
                    .weight(1.0)
                    .confidence(0.50)
                    .evidenceCount(1)
                    .supportingUrls(urlsJson)
                    .lastSeen(LocalDateTime.now())
                    .build();
            kgEdgeRepository.save(edge);
        }
    }

    private String determineRelation(KgNode nodeA, KgNode nodeB, List<EntityExtractedUpdateDTO> updates) {
        StringBuilder combinedText = new StringBuilder();
        for (EntityExtractedUpdateDTO u : updates) {
            CleanedUpdateDTO clean = u.getImportanceAssessedUpdate().getCredibilityAssessedUpdate().getValidatedUpdate().getClassifiedUpdate().getCleanedUpdate();
            combinedText.append(clean.getTitle()).append(" ").append(clean.getCleanedContent()).append(" ");
        }
        String text = combinedText.toString().toLowerCase();

        if (text.contains("written in") || text.contains("implemented in")) {
            return "WRITTEN_IN";
        } else if (text.contains("runs on") || text.contains("deploy on") || text.contains("hosted on")) {
            return "RUNS_ON";
        } else if (text.contains("affects") || text.contains("vulnerability in") || text.contains("exploit in")) {
            return "AFFECTS";
        } else if (text.contains("depends on") || text.contains("requires") || text.contains("dependency")) {
            return "DEPENDS_ON";
        } else if (text.contains("replaces") || text.contains("supersedes") || text.contains("deprecates")) {
            return "REPLACES";
        }
        return "RELATED_TO";
    }

    private String normalizeString(String val) {
        if (val == null) return "";
        return val.toLowerCase().replaceAll("[\\s\\-_]", "");
    }
}
