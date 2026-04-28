package com.techbite.service;

import com.techbite.dto.BiteResponseDTO;
import com.techbite.model.Bite;
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

    public BiteServiceImpl(BiteRepository biteRepository, UserRepository userRepository, ChatClient.Builder chatClientBuilder) {
        this.biteRepository = biteRepository;
        this.userRepository = userRepository;
        this.chatClient = chatClientBuilder.build();
    }

    @Override
    public Page<BiteResponseDTO> getFeed(Pageable pageable, Long categoryId) {
        Page<Bite> bites;
        if (categoryId != null) {
            bites = biteRepository.findByCategoryIdAndStatusOrderByPublishedAtDesc(categoryId, Bite.Status.PUBLISHED, pageable);
        } else {
            bites = biteRepository.findByStatusOrderByPublishedAtDesc(Bite.Status.PUBLISHED, pageable);
        }
        return bites.map(this::mapToDTO);
    }

    @Override
    public Page<BiteResponseDTO> getForYouFeed(Long userId, Pageable pageable) {
        Page<Bite> bites = biteRepository.findForYouFeedByUserId(userId, Bite.Status.PUBLISHED, pageable);
        if (bites.isEmpty()) {
            return getFeed(pageable, null); 
        }
        return bites.map(this::mapToDTO);
    }

    @Override
    public String summarizeContent(String biteIdStr) {
        try {
            Long biteId = Long.parseLong(biteIdStr);
            Optional<Bite> biteOpt = biteRepository.findById(biteId);
            
            String textToSummarize = biteOpt.map(b -> b.getTitle() + ": " + b.getContentSummary())
                                            .orElse("General tech news update.");

            System.out.println("[AI] Starting explanation for: " + textToSummarize);

            String prompt = "You are an expert tech mentor for CS students. " +
                            "Explain the following tech concept simply in 80-120 words. " +
                            "Use bullet points if needed. Focus on 'Why it matters' for developers:\n\n" + textToSummarize;

            String result = chatClient.prompt()
                .user(prompt)
                .call()
                .content();
                
            System.out.println("[AI] Success! Response generated.");
            return result;
        } catch (Exception e) {
            System.err.println("[AI] Error generating explanation: " + e.getMessage());
            return "Oops! The AI is having trouble simplifying this right now. Please try again in a moment.";
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
