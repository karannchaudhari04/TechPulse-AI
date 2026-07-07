package com.techpulse.agent;

import com.techpulse.agent.dto.SearchResultDTO;
import com.techpulse.model.SearchHistory;
import com.techpulse.repository.SearchHistoryRepository;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Agent orchestrating text retrieval strategies and persistence of query history logs.
 */
@Service
public class SemanticSearchAgent {

    private final SearchRetrievalStrategy searchRetrievalStrategy;
    private final SearchHistoryRepository searchHistoryRepository;

    public SemanticSearchAgent(SearchRetrievalStrategy searchRetrievalStrategy,
                               SearchHistoryRepository searchHistoryRepository) {
        this.searchRetrievalStrategy = searchRetrievalStrategy;
        this.searchHistoryRepository = searchHistoryRepository;
    }

    /**
     * Executes queries, log query texts to search_history, and returns sorted relevance results.
     */
    public List<SearchResultDTO> search(String query, Long userId) {
        if (userId != null && query != null && !query.isBlank()) {
            SearchHistory history = SearchHistory.builder()
                    .userId(userId)
                    .queryText(query)
                    .build();
            searchHistoryRepository.save(history);
        }
        return searchRetrievalStrategy.search(query, userId);
    }
}
