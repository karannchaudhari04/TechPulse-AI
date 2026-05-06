package com.techbite.service;

import com.techbite.dto.BiteResponseDTO;
import com.techbite.dto.CursorPageResponse;
import com.techbite.model.Bite;
import com.techbite.model.User;
import com.techbite.repository.BiteRepository;
import com.techbite.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestClient;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

import java.util.List;
import java.util.Optional;
import java.util.Set;

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
                           @org.springframework.context.annotation.Lazy RestClient.Builder restClientBuilder) {
        this.biteRepository = biteRepository;
        this.userRepository = userRepository;
        this.restClient = restClientBuilder.build();
    }

    @Override
    @org.springframework.scheduling.annotation.Async
    @Transactional
    public void reSummarizeAllBites() {
        log.info("[Migration] 🚀 Starting batch re-summarization...");
        
        int pageSize = 50;
        int pageNumber = 0;
        long totalUpdated = 0;
        
        Page<Bite> bitePage;
        do {
            bitePage = biteRepository.findAll(PageRequest.of(pageNumber, pageSize));
            log.info("[Migration] Processing batch {} (Size: {})", pageNumber + 1, bitePage.getNumberOfElements());
            
            for (Bite bite : bitePage.getContent()) {
                processSingleBiteReSummary(bite);
                totalUpdated++;
            }
            
            // Clear persistence context to free memory
            // Note: In a real high-scale app, we might use a dedicated MigrationService
            pageNumber++;
        } while (bitePage.hasNext());
        
        log.info("[Migration] 🎉 Finished! Total processed: {}", totalUpdated);
    }

    private void processSingleBiteReSummary(Bite bite) {
        try {
            String contentToAnalyze = (bite.getContentDescription() != null && !bite.getContentDescription().isEmpty())
                    ? bite.getContentDescription()
                    : bite.getContentSummary();

            String prompt = """
                You are a Senior Architect and Career Mentor at a top-tier tech firm.
                Analyze this tech news and re-summarize it with deep technical insight.
                
                TITLE: %s
                CONTENT: %s
                
                Format EXACTLY:
                SUMMARY:
                • <Core Tech & Architecture: 2-3 sentence technical insight.>
                • <Ecosystem & Impact: 1-2 sentence career impact.>
                • <Mentor Tip: 1-2 sentence actionable career insight.>
                """.formatted(bite.getTitle(), contentToAnalyze);

            List<String> modelsToTry = List.of(
                "gemini-3.1-flash-lite-preview", 
                "gemini-3-flash-preview", 
                "gemini-2.5-flash-lite"
            );
            
            String aiText = null;
            for (String modelName : modelsToTry) {
                try {
                    aiText = callGeminiApi(modelName, prompt);
                    if (aiText != null) break;
                } catch (Exception e) {
                    log.warn("[Migration] Model {} failed", modelName);
                }
            }

            if (aiText != null && aiText.contains("SUMMARY:")) {
                String newSummary = aiText.split("SUMMARY:")[1].trim();
                bite.setContentSummary(newSummary);
                biteRepository.save(bite);
            }
        } catch (Exception e) {
            log.error("[Migration] ❌ Failed bite {}: {}", bite.getId(), e.getMessage());
        }
    }

    private String callGeminiApi(String modelName, String prompt) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + geminiApiKey;
        var requestBody = java.util.Map.of("contents", List.of(java.util.Map.of("parts", List.of(java.util.Map.of("text", prompt)))));

        String jsonResponse = restClient.post()
                .uri(url)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

        if (jsonResponse != null && jsonResponse.contains("\"text\":")) {
            String[] parts = jsonResponse.split("\"text\": \"");
            if (parts.length > 1) {
                return parts[1].split("\"")[0].replace("\\n", "\n").replace("\\\"", "\"");
            }
        }
        return null;
    }

    @Override
    public CursorPageResponse<BiteResponseDTO> getAllBites(User user, String cursor, int limit) {
        Set<Long> likedIds = user != null ? userRepository.findLikedBiteIdsByUserId(user.getId()) : Set.of();
        LocalDateTime cursorDate = null;
        Long cursorId = null;
        if (cursor != null && cursor.contains("_")) {
            String[] parts = cursor.split("_");
            cursorDate = java.time.LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(Long.parseLong(parts[0])), java.time.ZoneId.systemDefault());
            cursorId = Long.parseLong(parts[1]);
        }
        
        List<Bite> bites = biteRepository.findNextPage(Bite.Status.PUBLISHED, cursorDate, cursorId, PageRequest.of(0, limit + 1));
        return buildCursorResponse(bites, limit, likedIds);
    }

    @Override
    public CursorPageResponse<BiteResponseDTO> getPersonalizedFeed(User user, String cursor, int limit) {
        if (user == null || user.getPreferences() == null || user.getPreferences().isEmpty()) {
            return getAllBites(user, cursor, limit);
        }
        
        Set<Long> likedIds = userRepository.findLikedBiteIdsByUserId(user.getId());
        LocalDateTime cursorDate = null;
        Long cursorId = null;
        if (cursor != null && cursor.contains("_")) {
            String[] parts = cursor.split("_");
            cursorDate = java.time.LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(Long.parseLong(parts[0])), java.time.ZoneId.systemDefault());
            cursorId = Long.parseLong(parts[1]);
        }
        
        List<Bite> bites = biteRepository.findForYouNextPage(user.getId(), Bite.Status.PUBLISHED, cursorDate, cursorId, PageRequest.of(0, limit + 1));
        
        if (bites.isEmpty() && cursor == null) {
            return getAllBites(user, cursor, limit);
        }
        return buildCursorResponse(bites, limit, likedIds);
    }

    @Override
    public CursorPageResponse<BiteResponseDTO> getBitesByCategory(User user, Long categoryId, String cursor, int limit) {
        Set<Long> likedIds = user != null ? userRepository.findLikedBiteIdsByUserId(user.getId()) : Set.of();
        LocalDateTime cursorDate = null;
        Long cursorId = null;
        if (cursor != null && cursor.contains("_")) {
            String[] parts = cursor.split("_");
            cursorDate = java.time.LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(Long.parseLong(parts[0])), java.time.ZoneId.systemDefault());
            cursorId = Long.parseLong(parts[1]);
        }
        
        List<Bite> bites = biteRepository.findCategoryNextPage(categoryId, Bite.Status.PUBLISHED, cursorDate, cursorId, PageRequest.of(0, limit + 1));
        return buildCursorResponse(bites, limit, likedIds);
    }

    private CursorPageResponse<BiteResponseDTO> buildCursorResponse(List<Bite> bites, int limit, Set<Long> likedIds) {
        boolean hasNext = bites.size() > limit;
        List<Bite> content = hasNext ? bites.subList(0, limit) : bites;
        
        String nextCursor = null;
        if (!content.isEmpty()) {
            Bite lastBite = content.get(content.size() - 1);
            long timeMillis = lastBite.getPublishedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
            nextCursor = timeMillis + "_" + lastBite.getId();
        }
        
        List<BiteResponseDTO> dtoList = content.stream().map(b -> mapToDTO(b, likedIds)).toList();
        return new CursorPageResponse<>(dtoList, nextCursor, hasNext);
    }


    private BiteResponseDTO mapToDTO(Bite bite, Set<Long> likedIds) {
        return BiteResponseDTO.builder()
                .id(bite.getId())
                .title(bite.getTitle())
                .contentSummary(bite.getContentSummary())
                .originalSourceUrl(bite.getOriginalSourceUrl())
                .authorAttribution(bite.getAuthorAttribution())
                .thumbnailUrl(bite.getThumbnailUrl())
                // Category is now eagerly fetched via EntityGraph in repository
                .categoryName(bite.getCategory() != null ? bite.getCategory().getName() : "Uncategorized")
                .publishedAt(bite.getPublishedAt())
                .engagementCount(bite.getEngagementCount())
                .isLiked(likedIds.contains(bite.getId()))
                .build();
    }
}
