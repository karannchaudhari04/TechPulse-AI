package com.techpulse.service;

import com.techpulse.agent.SemanticSearchAgent;
import com.techpulse.agent.dto.SearchResultDTO;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service implementation managing search queries and history logging.
 */
@Service
public class SearchServiceImpl implements SearchService {

    private final SemanticSearchAgent semanticSearchAgent;

    public SearchServiceImpl(SemanticSearchAgent semanticSearchAgent) {
        this.semanticSearchAgent = semanticSearchAgent;
    }

    @Override
    @Cacheable(value = "searchResults", key = "#query + ':' + (#userId != null ? #userId : 'anon')", unless = "#result == null")
    public List<SearchResultDTO> search(String query, Long userId) {
        return semanticSearchAgent.search(query, userId);
    }
}
