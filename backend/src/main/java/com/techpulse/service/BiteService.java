package com.techpulse.service;

import com.techpulse.dto.BiteResponseDTO;
import com.techpulse.dto.CursorPageResponse;
import com.techpulse.model.User;

public interface BiteService {
    CursorPageResponse<BiteResponseDTO> getAllBites(User user, String cursor, int limit);
    CursorPageResponse<BiteResponseDTO> getPersonalizedFeed(User user, String cursor, int limit);
    CursorPageResponse<BiteResponseDTO> getBitesByCategory(User user, Long categoryId, String cursor, int limit);
    void reSummarizeAllBites();
    BiteResponseDTO getBiteById(User user, Long id);
    String explainBite(Long id);
    String explainSimply(Long id);
    void markBitesAsViewed(User user, java.util.List<Long> biteIds);
    java.util.Set<Long> getViewedBiteIds(User user);
}
