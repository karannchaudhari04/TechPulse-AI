package com.techpulse.repository;

import com.techpulse.model.TechnologyEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA Repository for TechnologyEvent entities.
 */
@Repository
public interface TechnologyEventRepository extends JpaRepository<TechnologyEvent, String> {
}
