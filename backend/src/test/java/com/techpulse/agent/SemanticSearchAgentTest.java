package com.techpulse.agent;

import com.techpulse.agent.dto.SearchResultDTO;
import com.techpulse.model.SearchHistory;
import com.techpulse.repository.SearchHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class SemanticSearchAgentTest {

    private SearchRetrievalStrategy searchRetrievalStrategy;
    private SearchHistoryRepository searchHistoryRepository;
    private SemanticSearchAgent semanticSearchAgent;

    @BeforeEach
    public void setUp() {
        searchRetrievalStrategy = mock(SearchRetrievalStrategy.class);
        searchHistoryRepository = mock(SearchHistoryRepository.class);
        semanticSearchAgent = new SemanticSearchAgent(searchRetrievalStrategy, searchHistoryRepository);
    }

    @Test
    public void testSearch() {
        Long userId = 1L;
        String query = "Spring Boot";

        SearchResultDTO result = SearchResultDTO.builder()
                .eventId("event-1")
                .title("Spring Boot Ga")
                .relevanceScore(1.2)
                .matchReasons(List.of("title match"))
                .build();

        when(searchRetrievalStrategy.search(query, userId)).thenReturn(List.of(result));

        List<SearchResultDTO> results = semanticSearchAgent.search(query, userId);
        assertNotNull(results);
        assertFalse(results.isEmpty());
        assertEquals("event-1", results.get(0).getEventId());

        verify(searchHistoryRepository, times(1)).save(any(SearchHistory.class));
    }
}
