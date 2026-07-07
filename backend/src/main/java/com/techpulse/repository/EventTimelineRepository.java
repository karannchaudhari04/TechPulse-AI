package com.techpulse.repository;

import com.techpulse.model.EventTimeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for EventTimeline entities.
 */
@Repository
public interface EventTimelineRepository extends JpaRepository<EventTimeline, String> {
    List<EventTimeline> findByEntityNameOrderByEventTimestampAsc(String entityName);
}
