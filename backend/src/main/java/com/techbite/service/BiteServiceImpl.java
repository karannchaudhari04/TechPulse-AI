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
                You are a friendly and experienced tech mentor who explains latest technology news to computer science students and junior developers.

                Summarize the given article into a short, easy-to-understand "bite".

                Article to Analyze:
                TITLE: %s
                CONTENT: %s

                Format your response EXACTLY as follows:
                TITLE: <A clear, interesting, and easy-to-understand title. Max 75 characters.>
                SUMMARY:
                • <Explain the main idea in simple and clear language>
                • <Why this matters for students or junior software engineers>
                • <One practical tip or key takeaway>

                Strict Rules:
                - Use simple, everyday language. Avoid heavy jargon.
                - Total summary must be between 90 to 140 words.
                - Write in natural flowing paragraphs with bullet points.
                - Never cut off mid-sentence. Always complete your thoughts.
                - Keep a positive, encouraging, and helpful tone.
                - Stick ONLY to the facts in the article. Do not hallucinate.
                """.formatted(bite.getTitle(), contentToAnalyze);

            List<String> modelsToTry = List.of(
                "gemini-2.5-flash",
                "gemini-2.5-flash-lite",
                "gemini-3-flash-preview",
                "gemini-3.1-flash-lite-preview",
                "gemini-2.5-pro"
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


    @Override
    public BiteResponseDTO getBiteById(User user, Long id) {
        Bite bite = biteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bite not found"));
        Set<Long> likedIds = user != null ? userRepository.findLikedBiteIdsByUserId(user.getId()) : Set.of();
        return mapToDTO(bite, likedIds);
    }

    @Override
    public String explainBite(Long id) {
        Bite bite = biteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bite not found"));
        
        String contentToAnalyze = (bite.getContentDescription() != null && !bite.getContentDescription().isEmpty())
                ? bite.getContentDescription()
                : bite.getContentSummary();

        String prompt = """
            You are a friendly senior software engineer mentoring junior developers and tech enthusiasts.

            Explain the following technology topic or news in a **clear, detailed but easy-to-understand way**.

            Use real-world analogies where possible. Break down complex ideas simply.

            **STRICT REQUIREMENTS:**
            - Total explanation must be between 120 and 180 words.
            - The response MUST be complete. Never cut off mid-sentence.
            - Always finish your thoughts with a proper concluding sentence.
            - Write in natural, flowing paragraphs.
            - Keep a positive, encouraging, and helpful tone.

            Topic: %s
            Content: %s

            Now give a complete, polished, and easy-to-understand technical explanation:
            """.formatted(bite.getTitle(), contentToAnalyze);

        List<String> modelsToTry = List.of(
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-3-flash-preview",
            "gemini-3.1-flash-lite-preview",
            "gemini-2.5-pro"
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

    @Override
    public String explainSimply(Long id) {
        Bite bite = biteRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Bite not found"));

        String contentToAnalyze = (bite.getContentDescription() != null && !bite.getContentDescription().isEmpty())
            ? bite.getContentDescription()
            : bite.getContentSummary();

        String prompt = """
            You are a friendly senior software engineer who loves mentoring junior developers and tech enthusiasts.

            Your goal is to explain the following tech topic in a **very clear, simple, and engaging way**.

            Use real-world analogies and everyday language. Avoid heavy jargon — if you use a technical term, explain it simply.

            **STRICT REQUIREMENTS:**
            - Total explanation must be between 100 and 150 words.
            - The response MUST be complete. Never cut off mid-sentence.
            - Always finish your thoughts with a proper concluding sentence.
            - Write in natural, flowing paragraphs (no bullet points).
            - Keep a positive, encouraging, and easy-to-read tone.

            Topic: %s
            Content: %s

            Now give a complete, polished, and easy-to-understand explanation:
            """.formatted(bite.getTitle(), contentToAnalyze);

        List<String> modelsToTry = List.of(
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-3-flash-preview",
            "gemini-3.1-flash-lite-preview",
            "gemini-2.5-pro"
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
}
