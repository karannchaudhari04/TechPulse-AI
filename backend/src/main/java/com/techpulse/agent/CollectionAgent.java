package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.dto.CollectionDTO;
import com.techpulse.model.CollectionEvent;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.model.UserCollection;
import com.techpulse.repository.CollectionEventRepository;
import com.techpulse.repository.TechnologyEventRepository;
import com.techpulse.repository.UserCollectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Agent handling manual bookmark folders and dynamic auto-updating collections.
 */
@Service
public class CollectionAgent {

    private final UserCollectionRepository userCollectionRepository;
    private final CollectionEventRepository collectionEventRepository;
    private final TechnologyEventRepository technologyEventRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CollectionAgent(UserCollectionRepository userCollectionRepository,
                           CollectionEventRepository collectionEventRepository,
                           TechnologyEventRepository technologyEventRepository) {
        this.userCollectionRepository = userCollectionRepository;
        this.collectionEventRepository = collectionEventRepository;
        this.technologyEventRepository = technologyEventRepository;
    }

    @Transactional
    public UserCollection createCollection(Long userId, String name, String description, boolean isAutoUpdating, String criteriaJson) {
        UserCollection coll = UserCollection.builder()
                .userId(userId)
                .name(name)
                .description(description)
                .isAutoUpdating(isAutoUpdating)
                .queryCriteriaJson(criteriaJson)
                .build();
        UserCollection saved = userCollectionRepository.save(coll);
        
        if (isAutoUpdating && criteriaJson != null) {
            updateAutoCollectionEvents(saved);
        }
        return saved;
    }

    /**
     * Re-aggregates matching technology events into auto-updating user collections.
     */
    @Transactional
    public void updateAutoCollectionEvents(UserCollection collection) {
        if (!collection.getIsAutoUpdating() || collection.getQueryCriteriaJson() == null) return;

        List<CollectionEvent> existing = collectionEventRepository.findByCollectionId(collection.getId());
        collectionEventRepository.deleteAll(existing);

        List<TechnologyEvent> events = technologyEventRepository.findAll();
        List<?> criteria = new ArrayList<>();
        try {
            criteria = objectMapper.readValue(collection.getQueryCriteriaJson(), List.class);
        } catch (Exception ignored) {}

        if (criteria.isEmpty()) return;

        for (TechnologyEvent event : events) {
            boolean matches = false;
            if (event.getCategoriesJson() != null) {
                try {
                    List<?> cats = objectMapper.readValue(event.getCategoriesJson(), List.class);
                    for (Object catObj : cats) {
                        if (criteria.contains(String.valueOf(catObj))) {
                            matches = true;
                            break;
                        }
                    }
                } catch (Exception ignored) {}
            }

            if (!matches && event.getEntitiesJson() != null) {
                try {
                    List<?> ents = objectMapper.readValue(event.getEntitiesJson(), List.class);
                    for (Object entObj : ents) {
                        if (criteria.contains(String.valueOf(entObj))) {
                            matches = true;
                            break;
                        }
                    }
                } catch (Exception ignored) {}
            }

            if (matches) {
                CollectionEvent ce = CollectionEvent.builder()
                        .collectionId(collection.getId())
                        .eventId(event.getId())
                        .build();
                collectionEventRepository.save(ce);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<CollectionDTO> getUserCollections(Long userId) {
        List<UserCollection> colls = userCollectionRepository.findByUserId(userId);
        List<CollectionDTO> dtos = new ArrayList<>();

        for (UserCollection c : colls) {
            List<CollectionEvent> mapping = collectionEventRepository.findByCollectionId(c.getId());
            List<String> eventIds = mapping.stream().map(CollectionEvent::getEventId).collect(Collectors.toList());

            dtos.add(CollectionDTO.builder()
                    .id(c.getId())
                    .name(c.getName())
                    .description(c.getDescription())
                    .isAutoUpdating(c.getIsAutoUpdating())
                    .matchingEvents(eventIds)
                    .build());
        }

        return dtos;
    }
}
