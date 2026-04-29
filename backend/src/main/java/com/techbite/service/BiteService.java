package com.techbite.service;

import com.techbite.dto.BiteResponseDTO;
import com.techbite.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface BiteService {
    Page<BiteResponseDTO> getAllBites(Pageable pageable);
    Page<BiteResponseDTO> getPersonalizedFeed(User user, Pageable pageable);
    String getDetailedExplanation(Long biteId);
}
