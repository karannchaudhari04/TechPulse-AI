package com.techpulse.service;

import com.techpulse.agent.dto.SearchResultDTO;
import java.util.List;

/**
 * Service interface managing search queries.
 */
public interface SearchService {
    List<SearchResultDTO> search(String query, Long userId);
}
