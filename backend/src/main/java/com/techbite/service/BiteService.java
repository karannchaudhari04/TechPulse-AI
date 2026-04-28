package com.techbite.service;

import com.techbite.dto.BiteResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface BiteService {
    Page<BiteResponseDTO> getFeed(Pageable pageable, Long categoryId);
    Page<BiteResponseDTO> getForYouFeed(Long userId, Pageable pageable);
    String summarizeContent(String longText);
}
