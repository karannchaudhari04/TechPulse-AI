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
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.ai.openai.OpenAiChatOptions;

@Service
@Slf4j
public class BiteServiceImpl implements BiteService {

    private final BiteRepository biteRepository;
    private final UserRepository userRepository;
    private final RestClient restClient;
    private final ChatClient explainChatClient;

    @Value("${spring.ai.openai.api-key}")
    private String geminiApiKey;

    @Value("${spring.ai.openai.explain-api-key}")
    private String explainApiKey;

    public BiteServiceImpl(BiteRepository biteRepository, 
                           UserRepository userRepository,
                           @org.springframework.context.annotation.Lazy RestClient.Builder restClientBuilder,
                           @org.springframework.beans.factory.annotation.Qualifier("explainChatClient") @org.springframework.context.annotation.Lazy ChatClient explainChatClient) {
        this.biteRepository = biteRepository;
        this.userRepository = userRepository;
        this.restClient = restClientBuilder.build();
        this.explainChatClient = explainChatClient;
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
                You are a friendly tech mentor explaining news to CS students and junior devs.
                Summarize this tech article simply.
                
                Article:
                TITLE: %s
                CONTENT: %s
                
                Output EXACTLY in this format:
                TITLE: <Engaging, easy title under 75 chars>
                SUMMARY:
                • <Main idea in clear, everyday words>
                • <Why this matters to a tech student or junior engineer>
                • <One encouraging tip or practical takeaway>
                
                Rules:
                - Keep SUMMARY length between 70 to 90 words.
                - Avoid heavy jargon. If used, explain it simply.
                - Finish all thoughts with complete sentences.
                - Keep an encouraging and helpful tone.
                - Stick strictly to the article facts. No hallucinations.
                """.formatted(bite.getTitle(), contentToAnalyze);

            List<String> modelsToTry = List.of(
                "gemini-2.5-flash",
                "gemini-2.5-flash-lite",
                "gemini-2.0-flash",
                "gemini-1.5-flash",
                "gemini-1.5-flash-8b"
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
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + explainApiKey;
        var requestBody = java.util.Map.of("contents", List.of(java.util.Map.of("parts", List.of(java.util.Map.of("text", prompt)))));

        try {
            Map response = restClient.post()
                    .uri(url)
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.get("candidates") instanceof List candidates && !candidates.isEmpty()) {
                Map firstCandidate = (Map) candidates.get(0);
                if (firstCandidate != null && firstCandidate.get("content") instanceof Map content) {
                    List parts = (List) content.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        return (String) ((Map) parts.get(0)).get("text");
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[BiteService] Direct Gemini call failed for model {}: {}", modelName, e.getMessage());
        }
        return null;
    }

    @Override
    public CursorPageResponse<BiteResponseDTO> getAllBites(User user, String cursor, int limit) {
        LocalDateTime cursorDate = null;
        Long cursorId = null;
        if (cursor != null && cursor.contains("_")) {
            String[] parts = cursor.split("_");
            cursorDate = java.time.LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(Long.parseLong(parts[0])), java.time.ZoneId.systemDefault());
            cursorId = Long.parseLong(parts[1]);
        }
        
        List<Bite> bites;
        if (user != null) {
            bites = biteRepository.findNextPageExcludeViewed(user.getId(), Bite.Status.PUBLISHED, cursorDate, cursorId, PageRequest.of(0, limit + 1));
        } else {
            bites = biteRepository.findNextPage(Bite.Status.PUBLISHED, cursorDate, cursorId, PageRequest.of(0, limit + 1));
        }
        return buildCursorResponse(bites, limit);
    }

    @Override
    public CursorPageResponse<BiteResponseDTO> getPersonalizedFeed(User user, String cursor, int limit) {
        if (user == null || user.getPreferences() == null || user.getPreferences().isEmpty()) {
            return getAllBites(user, cursor, limit);
        }
        
        LocalDateTime cursorDate = null;
        Long cursorId = null;
        if (cursor != null && cursor.contains("_")) {
            String[] parts = cursor.split("_");
            cursorDate = java.time.LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(Long.parseLong(parts[0])), java.time.ZoneId.systemDefault());
            cursorId = Long.parseLong(parts[1]);
        }
        
        List<Bite> bites = biteRepository.findForYouNextPageExcludeViewed(user.getId(), Bite.Status.PUBLISHED, cursorDate, cursorId, PageRequest.of(0, limit + 1));
        
        if (bites.isEmpty() && cursor == null) {
            return getAllBites(user, cursor, limit);
        }
        return buildCursorResponse(bites, limit);
    }

    @Override
    public CursorPageResponse<BiteResponseDTO> getBitesByCategory(User user, Long categoryId, String cursor, int limit) {
        LocalDateTime cursorDate = null;
        Long cursorId = null;
        if (cursor != null && cursor.contains("_")) {
            String[] parts = cursor.split("_");
            cursorDate = java.time.LocalDateTime.ofInstant(java.time.Instant.ofEpochMilli(Long.parseLong(parts[0])), java.time.ZoneId.systemDefault());
            cursorId = Long.parseLong(parts[1]);
        }
        
        List<Bite> bites;
        if (user != null) {
            bites = biteRepository.findCategoryNextPageExcludeViewed(user.getId(), categoryId, Bite.Status.PUBLISHED, cursorDate, cursorId, PageRequest.of(0, limit + 1));
        } else {
            bites = biteRepository.findCategoryNextPage(categoryId, Bite.Status.PUBLISHED, cursorDate, cursorId, PageRequest.of(0, limit + 1));
        }
        return buildCursorResponse(bites, limit);
    }

    private CursorPageResponse<BiteResponseDTO> buildCursorResponse(List<Bite> bites, int limit) {
        boolean hasNext = bites.size() > limit;
        List<Bite> content = hasNext ? bites.subList(0, limit) : bites;
        
        String nextCursor = null;
        if (!content.isEmpty()) {
            Bite lastBite = content.get(content.size() - 1);
            long timeMillis = lastBite.getPublishedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();
            nextCursor = timeMillis + "_" + lastBite.getId();
        }
        
        List<BiteResponseDTO> dtoList = content.stream().map(b -> mapToDTO(b)).toList();
        return new CursorPageResponse<>(dtoList, nextCursor, hasNext);
    }


    @Override
    public BiteResponseDTO getBiteById(User user, Long id) {
        Bite bite = biteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bite not found"));
        return mapToDTO(bite);
    }

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "biteExplanations", key = "#id")
    public String explainBite(Long id) {
        Bite bite = biteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bite not found"));
        
        String contentToAnalyze = (bite.getContentDescription() != null && !bite.getContentDescription().isEmpty())
                ? bite.getContentDescription()
                : bite.getContentSummary();

        String prompt = """
            You are a friendly senior engineer mentoring junior devs.
            Explain the following topic simply, using everyday words and fun, real-world analogies.
            
            Topic: %s
            Content: %s
            
            Rules:
            - Write in natural, friendly paragraphs (100-140 words).
            - No complex jargon (explain it simply if used).
            - Keep it encouraging and positive.
            - Must finish with a complete, supportive concluding sentence.
            """.formatted(bite.getTitle(), contentToAnalyze);

        List<String> modelsToTry = List.of(
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b"
        );
        
        String aiText = null;
        for (String modelName : modelsToTry) {
            try {
                aiText = callGeminiApi(modelName, prompt);
                if (aiText != null) break;
            } catch (Exception e) {
                log.warn("[Explain] Model {} failed: {}", modelName, e.getMessage());
            }
        }

        if (aiText == null) {
            throw new RuntimeException("All AI models failed to explain this bite.");
        }

        return aiText;
    }

    private BiteResponseDTO mapToDTO(Bite bite) {
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
                .isLiked(false)
                .build();
    }

    @Override
    @org.springframework.cache.annotation.Cacheable(value = "biteExplanationsSimply", key = "#id")
    public String explainSimply(Long id) {
        Bite bite = biteRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Bite not found"));

        String contentToAnalyze = (bite.getContentDescription() != null && !bite.getContentDescription().isEmpty())
            ? bite.getContentDescription()
            : bite.getContentSummary();

        String prompt = """
            You are a friendly software engineer mentoring junior devs.
            Explain this tech topic in simple, encouraging terms using a fun analogy.
            
            Topic: %s
            Content: %s
            
            Rules:
            - Write in natural, flowing paragraphs (no bullets).
            - Word count: 90-130 words.
            - Avoid heavy jargon. Make it easy and encouraging.
            - The final sentence must be fully complete and supportive.
            """.formatted(bite.getTitle(), contentToAnalyze);

        List<String> modelsToTry = List.of(
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b"
        );

        String explanation = null;

        for (String model : modelsToTry) {
            try {
                // Temporarily override model for this call
                OpenAiChatOptions options = OpenAiChatOptions.builder()
                    .withModel(model)
                    .withTemperature(0.65f)
                    .build();

                String result = explainChatClient.prompt()
                    .options(options)
                    .user(prompt)
                    .call()
                    .content();

                if (result != null && result.trim().length() > 80) {
                    explanation = result.trim();
                    break;
                }
            } 
            catch (Exception e) {
                log.warn("[ExplainSimply] Model {} failed for bite {}: {}", model, id, e.getMessage());
            }
        }

        // Strong safety net against truncation
        if (explanation == null || explanation.trim().length() < 80 || 
            explanation.endsWith("\\") || explanation.endsWith("...")) {
        
            explanation = "I couldn't generate a complete explanation right now. Please try again or read the original summary above.";
        }

        return explanation.trim();
    }

    @Override
    @Transactional
    public void markBitesAsViewed(User user, List<Long> biteIds) {
        if (user == null || biteIds == null || biteIds.isEmpty()) {
            return;
        }
        for (Long biteId : biteIds) {
            biteRepository.insertViewedBite(user.getId(), biteId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Set<Long> getViewedBiteIds(User user) {
        if (user == null) {
            return Set.of();
        }
        return biteRepository.findViewedBiteIdsByUserId(user.getId());
    }
}
