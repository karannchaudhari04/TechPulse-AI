package com.techpulse.repository;

import com.techpulse.model.CollectionEvent;
import com.techpulse.model.CollectionEventId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CollectionEventRepository extends JpaRepository<CollectionEvent, CollectionEventId> {
    List<CollectionEvent> findByCollectionId(Long collectionId);
}
