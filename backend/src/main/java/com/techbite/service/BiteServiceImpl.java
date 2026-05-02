package com.techbite.service;

import com.techbite.dto.BiteResponseDTO;
import com.techbite.model.Bite;
import com.techbite.model.User;
import com.techbite.repository.BiteRepository;
import com.techbite.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestClient;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class BiteServiceImpl implements BiteService {

    private final BiteRepository biteRepository;
    private final UserRepository userRepository;
    private final RestClient restClient;

    @Value("${spring.ai.openai.api-key}")
    private String geminiApiKey;

    public BiteServiceImpl(BiteRepository biteRepository, 
                           UserRepository userRepository,
                           RestClient.Builder restClientBuilder) {
        this.biteRepository = biteRepository;
        this.userRepository = userRepository;
        this.restClient = restClientBuilder.build();
    }

    @Override
    @Transactional
    public void reSummarizeAllBites() {
        log.info("[Migration] 🚀 Starting re-summarization of all bites...");
        List<Bite> allBites = biteRepository.findAll();
        int count = 0;

        for (Bite bite : allBites) {
            try {
                String contentToAnalyze = bite.getContentDescription() != null && !bite.getContentDescription().isEmpty() 
                        ? bite.getContentDescription() 
                        : bite.getContentSummary(); // Fallback to old summary if description is missing

                String prompt = """
                    You are a Senior Architect and Career Mentor at a top-tier tech firm.
                    Your task is to analyze this tech news and re-summarize it with deep technical insight.
                    
                    Article:
                    TITLE: %s
                    CONTENT: %s
                    
                    Format your response EXACTLY as follows:
                    SUMMARY:
                    • <Core Tech: 1-2 sentence technical insight.>
                    • <Architecture: 1-2 sentence engineering 'why'.>
                    • <Ecosystem: 1-2 sentence future/career impact.>
                    • <Action: FAANG-level tip.>
                    
                    Strict Rules:
                    - YOU MUST PROVIDE EXACTLY 3 TO 4 BULLET POINTS.
                    - THE TOTAL SUMMARY LENGTH MUST BE BETWEEN 80 AND 100 WORDS.
                    - Use the Unicode bullet character (•).
                    - Stick ONLY to the facts.
                    """.formatted(bite.getTitle(), contentToAnalyze);

                // --- Direct Gemini API Call (Bulletproof Logic) ---
                String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey;
                
                var requestBody = java.util.Map.of(
                    "contents", java.util.List.of(
                        java.util.Map.of("parts", java.util.List.of(
                            java.util.Map.of("text", prompt)
                        ))
                    )
                );

                String jsonResponse = restClient.post()
                        .uri(url)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);

                if (jsonResponse != null && jsonResponse.contains("\"text\":")) {
                    // Simple parsing for the re-summarization tool
                    String[] parts = jsonResponse.split("\"text\": \"");
                    if (parts.length > 1) {
                        String aiText = parts[1].split("\"")[0].replace("\\n", "\n").replace("\\\"", "\"");
                        
                        if (aiText.contains("SUMMARY:")) {
                            String newSummary = aiText.split("SUMMARY:")[1].trim();
                            bite.setContentSummary(newSummary);
                            biteRepository.save(bite);
                            count++;
                            log.info("[Migration] ✅ [{}/{}] Updated: {}", count, allBites.size(), bite.getTitle());
                        }
                    }
                }
            } catch (Exception e) {
                log.error("[Migration] ❌ Failed to re-summarize bite: " + bite.getId(), e);
            }
        }
        log.info("[Migration] 🎉 Finished! {}/{} bites re-summarized.", count, allBites.size());
    }

    @Override
    public Page<BiteResponseDTO> getAllBites(User user, Pageable pageable) {
        return biteRepository.findByStatusOrderByPublishedAtDesc(Bite.Status.PUBLISHED, pageable)
                .map(bite -> mapToDTO(bite, user));
    }

    @Override
    public Page<BiteResponseDTO> getPersonalizedFeed(User user, Pageable pageable) {
        if (user == null || user.getPreferences() == null || user.getPreferences().isEmpty()) {
            return getAllBites(user, pageable);
        }
        Page<Bite> bites = biteRepository.findForYouFeedByUserId(user.getId(), Bite.Status.PUBLISHED, pageable);
        if (bites.isEmpty()) {
            return getAllBites(user, pageable);
        }
        return bites.map(bite -> mapToDTO(bite, user));
    }

    @Override
    public Page<BiteResponseDTO> getBitesByCategory(User user, Long categoryId, Pageable pageable) {
        return biteRepository.findByCategoryIdAndStatusOrderByPublishedAtDesc(categoryId, Bite.Status.PUBLISHED, pageable)
                .map(bite -> mapToDTO(bite, user));
    }


    private BiteResponseDTO mapToDTO(Bite bite, User user) {
        return BiteResponseDTO.builder()
                .id(bite.getId())
                .title(bite.getTitle())
                .contentSummary(bite.getContentSummary())
                .originalSourceUrl(bite.getOriginalSourceUrl())
                .authorAttribution(bite.getAuthorAttribution())
                .thumbnailUrl(bite.getThumbnailUrl())
                .categoryName(bite.getCategory() != null ? bite.getCategory().getName() : "Uncategorized")
                .publishedAt(bite.getPublishedAt())
                .engagementCount(bite.getEngagementCount())
                .isLiked(user != null && user.getLikedBites().contains(bite))
                .build();
    }
}
