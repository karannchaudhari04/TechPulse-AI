package com.techbite.service;

import com.techbite.dto.BiteResponseDTO;
import com.techbite.model.Bite;
import com.techbite.model.User;
import com.techbite.repository.BiteRepository;
import com.techbite.repository.UserRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class BiteServiceImpl implements BiteService {

    private final BiteRepository biteRepository;
    private final UserRepository userRepository;
    private final ChatClient chatClient;

    public BiteServiceImpl(BiteRepository biteRepository, 
                           UserRepository userRepository, 
                           ChatClient.Builder chatClientBuilder) {
        this.biteRepository = biteRepository;
        this.userRepository = userRepository;
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Page<BiteResponseDTO> getAllBites(Pageable pageable) {
        return biteRepository.findByStatusOrderByPublishedAtDesc(Bite.Status.PUBLISHED, pageable)
                .map(this::mapToDTO);
    }

    @Override
    public Page<BiteResponseDTO> getPersonalizedFeed(User user, Pageable pageable) {
        if (user == null || user.getPreferences() == null || user.getPreferences().isEmpty()) {
            return getAllBites(pageable);
        }
        Page<Bite> bites = biteRepository.findForYouFeedByUserId(user.getId(), Bite.Status.PUBLISHED, pageable);
        if (bites.isEmpty()) {
            return getAllBites(pageable);
        }
        return bites.map(this::mapToDTO);
    }

    @Override
    public String getDetailedExplanation(Long biteId) {
        try {
            Optional<Bite> biteOpt = biteRepository.findById(biteId);
            if (biteOpt.isEmpty()) return "Bite not found.";
            
            Bite bite = biteOpt.get();
            String textToSummarize = bite.getTitle() + ": " + bite.getContentSummary();

            String prompt = "You are an expert tech mentor for CS students. " +
                            "Explain the following tech concept simply in 100-150 words. " +
                            "Use bullet points if needed. Focus on 'Why it matters' for developers " +
                            "and mention any related concepts like System Design, DSA, or Operating Systems:\n\n" + textToSummarize;

            return chatClient.prompt()
                .user(prompt)
                .call()
                .content();
        } catch (Exception e) {
            return "Oops! The AI is having trouble simplifying this right now. Please try again later.";
        }
    }

    private BiteResponseDTO mapToDTO(Bite bite) {
        return BiteResponseDTO.builder()
                .id(bite.getId())
                .title(bite.getTitle())
                .contentSummary(bite.getContentSummary())
                .originalSourceUrl(bite.getOriginalSourceUrl())
                .authorAttribution(bite.getAuthorAttribution())
                .thumbnailUrl(bite.getThumbnailUrl())
                .categoryName(bite.getCategory() != null ? bite.getCategory().getName() : "Uncategorized")
                .publishedAt(bite.getPublishedAt())
                .build();
    }
}
