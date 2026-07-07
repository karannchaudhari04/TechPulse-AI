package com.techpulse.agent;

import com.techpulse.agent.dto.CollectionDTO;
import com.techpulse.model.CollectionEvent;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.model.UserCollection;
import com.techpulse.repository.CollectionEventRepository;
import com.techpulse.repository.TechnologyEventRepository;
import com.techpulse.repository.UserCollectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class CollectionAgentTest {

    private UserCollectionRepository userCollectionRepository;
    private CollectionEventRepository collectionEventRepository;
    private TechnologyEventRepository technologyEventRepository;
    private CollectionAgent collectionAgent;

    @BeforeEach
    public void setUp() {
        userCollectionRepository = mock(UserCollectionRepository.class);
        collectionEventRepository = mock(CollectionEventRepository.class);
        technologyEventRepository = mock(TechnologyEventRepository.class);
        collectionAgent = new CollectionAgent(
                userCollectionRepository, collectionEventRepository, technologyEventRepository
        );
    }

    @Test
    public void testCreateCollectionAndAutoUpdate() {
        Long userId = 1L;
        UserCollection collection = UserCollection.builder()
                .id(10L)
                .userId(userId)
                .name("Spring Boot")
                .isAutoUpdating(true)
                .queryCriteriaJson("[\"Spring Boot\"]")
                .build();

        TechnologyEvent event = TechnologyEvent.builder()
                .id("event-1")
                .title("Spring Boot release")
                .entitiesJson("[\"Spring Boot\"]")
                .build();

        when(userCollectionRepository.save(any(UserCollection.class))).thenReturn(collection);
        when(technologyEventRepository.findAll()).thenReturn(List.of(event));

        UserCollection result = collectionAgent.createCollection(userId, "Spring Boot", "desc", true, "[\"Spring Boot\"]");
        assertNotNull(result);
        assertEquals(10L, result.getId());

        verify(collectionEventRepository, times(1)).save(any(CollectionEvent.class));
    }
}
