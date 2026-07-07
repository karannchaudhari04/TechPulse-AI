package com.techpulse.repository;

import com.techpulse.model.KgNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for KgNode entities.
 */
@Repository
public interface KgNodeRepository extends JpaRepository<KgNode, String> {
    Optional<KgNode> findByNormalizedName(String normalizedName);
}
