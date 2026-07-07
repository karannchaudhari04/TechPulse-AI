package com.techpulse.repository;

import com.techpulse.model.KgEdge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for KgEdge entities.
 */
@Repository
public interface KgEdgeRepository extends JpaRepository<KgEdge, String> {
    Optional<KgEdge> findBySourceNodeIdAndTargetNodeIdAndRelationType(String sourceNodeId, String targetNodeId, String relationType);
}
