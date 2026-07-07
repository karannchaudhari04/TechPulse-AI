package com.techpulse.agent;

import com.techpulse.agent.dto.SearchResultDTO;
import java.util.List;

/**
 * Interface mapping strategy patterns for future hybrid search retrieval extensions.
 */
public interface SearchRetrievalStrategy {
    List<SearchResultDTO> search(String query, Long userId);
}
