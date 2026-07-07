package com.techpulse.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.*;
import com.techpulse.agent.dto.*;
import com.techpulse.dto.ApiResponse;
import com.techpulse.dto.PageResponse;
import com.techpulse.model.*;
import com.techpulse.repository.*;
import com.techpulse.service.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Controller exposing personalized feed, semantic search, user follows, bookmark collections, and notifications.
 */
@RestController
@RequestMapping("/api/v1")
public class PersonalizationController {

    private final RecommendationService recommendationService;
    private final SearchService searchService;
    private final CollectionAgent collectionAgent;
    private final UserFollowRepository userFollowRepository;
    private final UserSavedEventRepository userSavedEventRepository;
    private final InteractionLogRepository interactionLogRepository;
    private final NotificationEventRepository notificationEventRepository;
    private final UserRepository userRepository;
    private final EventSimilarityEngine eventSimilarityEngine;
    private final TechnologyEventRepository technologyEventRepository;
    private final InterestExtractionAgent interestExtractionAgent;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PersonalizationController(RecommendationService recommendationService,
                                     SearchService searchService,
                                     CollectionAgent collectionAgent,
                                     UserFollowRepository userFollowRepository,
                                     UserSavedEventRepository userSavedEventRepository,
                                     InteractionLogRepository interactionLogRepository,
                                     NotificationEventRepository notificationEventRepository,
                                     UserRepository userRepository,
                                     EventSimilarityEngine eventSimilarityEngine,
                                     TechnologyEventRepository technologyEventRepository,
                                     InterestExtractionAgent interestExtractionAgent) {
        this.recommendationService = recommendationService;
        this.searchService = searchService;
        this.collectionAgent = collectionAgent;
        this.userFollowRepository = userFollowRepository;
        this.userSavedEventRepository = userSavedEventRepository;
        this.interactionLogRepository = interactionLogRepository;
        this.notificationEventRepository = notificationEventRepository;
        this.userRepository = userRepository;
        this.eventSimilarityEngine = eventSimilarityEngine;
        this.technologyEventRepository = technologyEventRepository;
        this.interestExtractionAgent = interestExtractionAgent;
    }

    @GetMapping("/feed")
    public ResponseEntity<ApiResponse<List<PersonalizedFeedDTO>>> getFeeds() {
        Long userId = getOptionalUserId();
        List<PersonalizedFeedDTO> feeds = new ArrayList<>();

        List<RecommendationDTO> forYou = recommendationService.getRecommendations(userId, 10);
        feeds.add(PersonalizedFeedDTO.builder()
                .feedName("For You")
                .items(forYou)
                .build());

        List<RecommendationDTO> trending = recommendationService.getRecommendations(null, 5);
        feeds.add(PersonalizedFeedDTO.builder()
                .feedName("Trending")
                .items(trending)
                .build());

        return ResponseEntity.ok(ApiResponse.success(feeds, "Personalized feeds compiled successfully."));
    }

    @GetMapping("/feed/trending")
    public ResponseEntity<ApiResponse<List<RecommendationDTO>>> getTrendingFeed() {
        List<RecommendationDTO> trending = recommendationService.getRecommendations(null, 20);
        return ResponseEntity.ok(ApiResponse.success(trending, "Trending technology feed fetched successfully."));
    }

    @GetMapping("/feed/recommended")
    public ResponseEntity<ApiResponse<List<RecommendationDTO>>> getRecommendedFeed() {
        Long userId = getRequiredUserId();
        List<RecommendationDTO> recommended = recommendationService.getRecommendations(userId, 20);
        return ResponseEntity.ok(ApiResponse.success(recommended, "Recommended technology feed fetched successfully."));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<SearchResultDTO>>> search(@RequestParam String query) {
        Long userId = getOptionalUserId();
        List<SearchResultDTO> results = searchService.search(query, userId);
        return ResponseEntity.ok(ApiResponse.success(results, "Search results fetched successfully."));
    }

    @GetMapping("/event/{id}/related")
    public ResponseEntity<ApiResponse<List<SearchResultDTO>>> getRelatedEvents(@PathVariable String id) {
        Optional<TechnologyEvent> eventOpt = technologyEventRepository.findById(id);
        if (eventOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Event not found"));
        }

        TechnologyEvent target = eventOpt.get();
        List<TechnologyEvent> all = technologyEventRepository.findAll();
        List<SearchResultDTO> results = new ArrayList<>();

        for (TechnologyEvent event : all) {
            if (event.getId().equals(id)) continue;
            double score = eventSimilarityEngine.calculateSimilarity(target, event);
            if (score > 0.1) {
                results.add(SearchResultDTO.builder()
                        .eventId(event.getId())
                        .title(event.getTitle())
                        .relevanceScore(score)
                        .matchReasons(List.of("Similar content profiles"))
                        .build());
            }
        }

        results.sort((a, b) -> Double.compare(b.getRelevanceScore(), a.getRelevanceScore()));
        return ResponseEntity.ok(ApiResponse.success(results, "Related events resolved successfully."));
    }

    @GetMapping("/events")
    public ResponseEntity<ApiResponse<PageResponse<TechnologyEvent>>> getEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        org.springframework.data.domain.Sort sort = org.springframework.data.domain.Sort.by(
                "asc".equalsIgnoreCase(direction) ? org.springframework.data.domain.Sort.Direction.ASC : org.springframework.data.domain.Sort.Direction.DESC,
                sortBy != null ? sortBy : "firstSeen"
        );
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, sort);
        org.springframework.data.domain.Page<TechnologyEvent> eventPage = technologyEventRepository.findAll(pageable);

        PageResponse<TechnologyEvent> response = PageResponse.<TechnologyEvent>builder()
                .content(eventPage.getContent())
                .page(eventPage.getNumber())
                .size(eventPage.getSize())
                .totalPages(eventPage.getTotalPages())
                .totalElements(eventPage.getTotalElements())
                .hasNext(eventPage.hasNext())
                .hasPrevious(eventPage.hasPrevious())
                .build();

        return ResponseEntity.ok(ApiResponse.success(response, "Paginated events fetched successfully."));
    }

    @PostMapping("/user/interaction")
    public ResponseEntity<ApiResponse<Void>> recordInteraction(@RequestBody Map<String, String> request) {
        Long userId = getRequiredUserId();
        String eventId = request.get("eventId");
        String type = request.get("type");
        String val = request.get("value");

        InteractionLog log = InteractionLog.builder()
                .userId(userId)
                .eventId(eventId)
                .interactionType(type)
                .interactionValue(val)
                .build();
        interactionLogRepository.save(log);
        interestExtractionAgent.processInteractionsForUser(userId);
        recommendationService.evictRecommendations(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Interaction recorded successfully."));
    }

    @PostMapping("/user/follow")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> followEntity(@RequestBody Map<String, String> request) {
        Long userId = getRequiredUserId();
        String name = request.get("name");
        String type = request.get("type");

        Optional<UserFollow> existing = userFollowRepository.findByUserIdAndEntityNameAndEntityType(userId, name, type);
        if (existing.isPresent()) {
            userFollowRepository.delete(existing.get());
            recommendationService.evictRecommendations(userId);
            return ResponseEntity.ok(ApiResponse.success(null, "Entity unfollowed successfully."));
        } else {
            UserFollow follow = UserFollow.builder()
                    .userId(userId)
                    .entityName(name)
                    .entityType(type)
                    .build();
            userFollowRepository.save(follow);
            recommendationService.evictRecommendations(userId);
            return ResponseEntity.ok(ApiResponse.success(null, "Entity followed successfully."));
        }
    }

    @PostMapping("/user/bookmark")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> bookmarkEvent(@RequestBody Map<String, String> request) {
        Long userId = getRequiredUserId();
        String eventId = request.get("eventId");

        UserSavedEventId id = new UserSavedEventId(userId, eventId);
        Optional<UserSavedEvent> existing = userSavedEventRepository.findById(id);
        if (existing.isPresent()) {
            userSavedEventRepository.delete(existing.get());
            recommendationService.evictRecommendations(userId);
            return ResponseEntity.ok(ApiResponse.success(null, "Event bookmark removed successfully."));
        } else {
            UserSavedEvent bookmark = UserSavedEvent.builder()
                    .userId(userId)
                    .eventId(eventId)
                    .build();
            userSavedEventRepository.save(bookmark);
            recommendationService.evictRecommendations(userId);
            return ResponseEntity.ok(ApiResponse.success(null, "Event bookmarked successfully."));
        }
    }

    @PostMapping("/user/collection")
    public ResponseEntity<ApiResponse<UserCollection>> createCollection(@RequestBody Map<String, Object> request) {
        Long userId = getRequiredUserId();
        String name = (String) request.get("name");
        String desc = (String) request.get("description");
        Boolean isAuto = (Boolean) request.get("isAutoUpdating");
        List<?> criteria = (List<?>) request.get("queryCriteria");

        String criteriaJson = null;
        if (criteria != null) {
            try {
                criteriaJson = objectMapper.writeValueAsString(criteria);
            } catch (Exception ignored) {}
        }

        UserCollection coll = collectionAgent.createCollection(userId, name, desc, isAuto != null && isAuto, criteriaJson);
        recommendationService.evictRecommendations(userId);
        return ResponseEntity.ok(ApiResponse.success(coll, "User collection created successfully."));
    }

    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<List<NotificationEvent>>> getNotifications() {
        Long userId = getRequiredUserId();
        List<NotificationEvent> list = notificationEventRepository.findByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(list, "Notifications fetched successfully."));
    }

    private Long getRequiredUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new RuntimeException("Not authenticated");
        Object principal = auth.getPrincipal();
        if (principal instanceof User user) return user.getId();
        if (principal instanceof String uid) {
            return userRepository.findByFirebaseUid(uid)
                    .orElseThrow(() -> new RuntimeException("User not found"))
                    .getId();
        }
        throw new RuntimeException("Not authenticated");
    }

    private Long getOptionalUserId() {
        try {
            return getRequiredUserId();
        } catch (Exception e) {
            return null;
        }
    }
}
