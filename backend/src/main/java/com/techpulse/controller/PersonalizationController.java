package com.techpulse.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.dto.ApiResponse;
import com.techpulse.dto.CursorPageResponse;
import com.techpulse.dto.PageResponse;
import com.techpulse.model.*;
import com.techpulse.repository.*;
import com.techpulse.personalization.service.PersonalizationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
public class PersonalizationController {

    private static final Logger log = LoggerFactory.getLogger(PersonalizationController.class);

    private final TechnologyEventRepository technologyEventRepository;
    private final UserSavedEventRepository userSavedEventRepository;
    private final UserHistoryLogRepository userHistoryLogRepository;
    private final UserCollectionRepository userCollectionRepository;
    private final CollectionEventRepository collectionEventRepository;
    private final UserFollowRepository userFollowRepository;
    private final UserRepository userRepository;
    private final InteractionLogRepository interactionLogRepository;
    private final PersonalizationService personalizationService;
    private final CacheManager cacheManager;
    private final ObjectMapper objectMapper;

    // Single-flight locks to protect against cache stampede
    private final ConcurrentHashMap<String, Object> feedLocks = new ConcurrentHashMap<>();

    public PersonalizationController(TechnologyEventRepository technologyEventRepository,
                                     UserSavedEventRepository userSavedEventRepository,
                                     UserHistoryLogRepository userHistoryLogRepository,
                                     UserCollectionRepository userCollectionRepository,
                                     CollectionEventRepository collectionEventRepository,
                                     UserFollowRepository userFollowRepository,
                                     UserRepository userRepository,
                                     InteractionLogRepository interactionLogRepository,
                                     PersonalizationService personalizationService,
                                     CacheManager cacheManager) {
        this.technologyEventRepository = technologyEventRepository;
        this.userSavedEventRepository = userSavedEventRepository;
        this.userHistoryLogRepository = userHistoryLogRepository;
        this.userCollectionRepository = userCollectionRepository;
        this.collectionEventRepository = collectionEventRepository;
        this.userFollowRepository = userFollowRepository;
        this.userRepository = userRepository;
        this.interactionLogRepository = interactionLogRepository;
        this.personalizationService = personalizationService;
        this.cacheManager = cacheManager;
        this.objectMapper = new ObjectMapper();
    }

    @GetMapping("/feed")
    public ResponseEntity<ApiResponse<CursorPageResponse<Map<String, Object>>>> getFeed(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tech) {

        Long userId = getOptionalUserId();
        List<TechnologyEvent> events = getCachedPersonalizedFeed(userId);

        // Filter by category and technology tags if requested
        List<TechnologyEvent> filtered = events.stream()
                .filter(e -> filterByCategory(e, category))
                .filter(e -> filterByTech(e, tech))
                .collect(Collectors.toList());

        // Paginate using cursor (eventId)
        int startIndex = 0;
        if (cursor != null && !cursor.trim().isEmpty()) {
            for (int i = 0; i < filtered.size(); i++) {
                if (filtered.get(i).getId().equals(cursor.trim())) {
                    startIndex = i + 1;
                    break;
                }
            }
        }

        int endIndex = Math.min(startIndex + limit, filtered.size());
        List<TechnologyEvent> pageContent = filtered.subList(startIndex, endIndex);

        boolean hasNext = endIndex < filtered.size();
        String nextCursor = pageContent.isEmpty() ? null : pageContent.get(pageContent.size() - 1).getId();

        List<Map<String, Object>> mappedContent = pageContent.stream()
                .map(event -> mapToFeedItem(event, userId))
                .collect(Collectors.toList());

        CursorPageResponse<Map<String, Object>> response = new CursorPageResponse<>(mappedContent, nextCursor, hasNext);
        return ResponseEntity.ok(ApiResponse.success(response, "Feed fetched successfully."));
    }

    @GetMapping("/feed/trending")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTrendingFeed() {
        Long userId = getOptionalUserId();
        List<TechnologyEvent> events = technologyEventRepository.findAll();

        // Trending: Sort by importance score & firstSeen descending
        events.sort((a, b) -> {
            double impA = a.getImportanceScore() != null ? a.getImportanceScore() : 0.0;
            double impB = b.getImportanceScore() != null ? b.getImportanceScore() : 0.0;
            if (impA != impB) return Double.compare(impB, impA);
            return b.getFirstSeen().compareTo(a.getFirstSeen());
        });

        List<Map<String, Object>> response = events.stream()
                .limit(20)
                .map(event -> mapToFeedItem(event, userId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(response, "Trending feed fetched successfully."));
    }

    @GetMapping("/feed/recommended")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRecommendedFeed() {
        Long userId = getRequiredUserId();
        List<TechnologyEvent> events = getCachedPersonalizedFeed(userId);

        // Filter out read events
        Set<String> readEventIds = userHistoryLogRepository.findByUserId(userId).stream()
                .filter(h -> h.getCompletionPercentage() != null && h.getCompletionPercentage() >= 100)
                .map(UserHistoryLog::getEventId)
                .collect(Collectors.toSet());

        List<Map<String, Object>> response = events.stream()
                .filter(e -> !readEventIds.contains(e.getId()))
                .limit(20)
                .map(event -> mapToFeedItem(event, userId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(response, "Recommended feed fetched successfully."));
    }

    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTrends() {
        Long userId = getOptionalUserId();
        List<TechnologyEvent> events = technologyEventRepository.findAll();
        
        Map<String, Integer> topicCounts = new HashMap<>();
        for (TechnologyEvent event : events) {
            List<String> topics = parseJsonList(event.getEntitiesJson());
            for (String t : topics) {
                topicCounts.put(t, topicCounts.getOrDefault(t, 0) + 1);
            }
        }

        // Check user preferences
        Set<String> preferredCategories = Collections.emptySet();
        if (userId != null) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                preferredCategories = user.getPreferences().stream()
                        .map(Category::getName)
                        .collect(Collectors.toSet());
            }
        }

        final Set<String> finalPreferred = preferredCategories;
        List<Map<String, Object>> trendsList = topicCounts.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(15)
                .map(entry -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", entry.getKey());
                    map.put("eventCount", entry.getValue());
                    
                    String status = entry.getValue() >= 10 ? "EXPLODING" : (entry.getValue() >= 5 ? "RISING" : "STABLE");
                    map.put("trendStatus", status);
                    
                    // Simple logic to set following state if it matches preferred onboarding categories or follows
                    boolean following = finalPreferred.contains(entry.getKey()) ||
                            userFollowRepository.findByUserIdAndEntityNameAndEntityType(userId, entry.getKey(), "TOPIC").isPresent();
                    map.put("following", following);
                    return map;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(trendsList, "Technology trends fetched successfully."));
    }

    @PostMapping("/user/interaction")
    public ResponseEntity<ApiResponse<Void>> recordInteraction(@RequestBody Map<String, String> request) {
        Long userId = getRequiredUserId();
        String eventId = request.get("eventId");
        String type = request.get("type");
        String val = request.get("value");

        personalizationService.recordInteraction(userId, eventId, type, val);
        evictFeedCache(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Interaction recorded successfully."));
    }

    @GetMapping("/user/bookmarks")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getBookmarks() {
        Long userId = getRequiredUserId();
        List<UserSavedEvent> saved = userSavedEventRepository.findByUserId(userId);
        List<String> eventIds = saved.stream().map(UserSavedEvent::getEventId).collect(Collectors.toList());
        List<TechnologyEvent> events = technologyEventRepository.findAllById(eventIds);

        List<Map<String, Object>> mapped = events.stream()
                .map(event -> mapToFeedItem(event, userId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(mapped, "Bookmarks fetched successfully."));
    }

    @PostMapping("/user/bookmark")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> addBookmark(@RequestBody Map<String, String> request) {
        Long userId = getRequiredUserId();
        String eventId = request.get("eventId");

        UserSavedEventId id = new UserSavedEventId(userId, eventId);
        if (!userSavedEventRepository.existsById(id)) {
            UserSavedEvent savedEvent = UserSavedEvent.builder()
                    .userId(userId)
                    .eventId(eventId)
                    .savedAt(LocalDateTime.now())
                    .build();
            userSavedEventRepository.save(savedEvent);
            evictFeedCache(userId);
        }

        return ResponseEntity.ok(ApiResponse.success(null, "Event bookmarked successfully."));
    }

    @DeleteMapping("/user/bookmark/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteBookmark(@PathVariable("id") String eventId) {
        Long userId = getRequiredUserId();
        UserSavedEventId id = new UserSavedEventId(userId, eventId);
        userSavedEventRepository.findById(id).ifPresent(userSavedEventRepository::delete);
        evictFeedCache(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Event bookmark removed successfully."));
    }

    @GetMapping("/user/history")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHistory() {
        Long userId = getRequiredUserId();
        List<UserHistoryLog> history = userHistoryLogRepository.findByUserId(userId);

        List<Map<String, Object>> list = history.stream().map(logItem -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", logItem.getId());
            map.put("eventId", logItem.getEventId());
            
            Optional<TechnologyEvent> event = technologyEventRepository.findById(logItem.getEventId());
            map.put("headline", event.isPresent() ? event.get().getTitle() : "Technology Update");
            map.put("lastOpened", logItem.getLastOpened().toString());
            map.put("readingDurationSec", logItem.getReadingDurationSec());
            map.put("completionPercentage", logItem.getCompletionPercentage());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(list, "Reading history fetched successfully."));
    }

    @DeleteMapping("/user/history")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> clearHistory() {
        Long userId = getRequiredUserId();
        userHistoryLogRepository.deleteByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Reading history cleared successfully."));
    }

    @GetMapping("/user/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        Long userId = getRequiredUserId();

        List<UserHistoryLog> history = userHistoryLogRepository.findByUserId(userId);
        long readCount = history.stream()
                .filter(h -> h.getCompletionPercentage() != null && h.getCompletionPercentage() >= 100)
                .count();

        long savedCount = userSavedEventRepository.findByUserId(userId).size();
        long collectionCount = userCollectionRepository.findByUserId(userId).size();

        User user = userRepository.findById(userId).orElse(null);
        int prefsCount = user != null ? user.getPreferences().size() : 0;

        Map<String, Object> stats = new HashMap<>();
        stats.put("eventsReadCount", readCount);
        stats.put("savedEventsCount", savedCount);
        stats.put("collectionsCount", collectionCount);
        stats.put("technologiesFollowedCount", prefsCount);

        // Weekly Activity metrics (mock activity logs over last 7 days)
        List<Map<String, Object>> weeklyActivity = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 6; i >= 0; i--) {
            LocalDateTime day = now.minusDays(i);
            Map<String, Object> dayMap = new HashMap<>();
            dayMap.put("day", day.getDayOfWeek().name().substring(0, 3));
            dayMap.put("count", i == 0 ? readCount : (int) (Math.random() * 5));
            weeklyActivity.add(dayMap);
        }
        stats.put("weeklyActivity", weeklyActivity);

        return ResponseEntity.ok(ApiResponse.success(stats, "Library statistics fetched successfully."));
    }

    @GetMapping("/events/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getEventById(@PathVariable String id) {
        Long userId = getOptionalUserId();
        return technologyEventRepository.findById(id)
                .map(event -> ResponseEntity.ok(ApiResponse.success(mapToFeedItem(event, userId), "Event found.")))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Event not found.")));
    }

    @GetMapping({"/event/{id}/related", "/events/{id}/related"})
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRelatedEvents(@PathVariable String id) {
        Long userId = getOptionalUserId();
        Optional<TechnologyEvent> eventOpt = technologyEventRepository.findById(id);
        if (eventOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Event not found."));
        }

        TechnologyEvent target = eventOpt.get();
        List<String> targetTopics = parseJsonList(target.getEntitiesJson());

        List<Map<String, Object>> related = technologyEventRepository.findAll().stream()
                .filter(e -> !e.getId().equals(id))
                .filter(e -> {
                    List<String> topics = parseJsonList(e.getEntitiesJson());
                    return topics.stream().anyMatch(targetTopics::contains);
                })
                .limit(5)
                .map(e -> mapToFeedItem(e, userId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(related, "Related events fetched successfully."));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<com.techpulse.agent.dto.SearchResultDTO>>> search(@RequestParam String query) {
        if (query == null || query.isBlank()) {
            return ResponseEntity.ok(ApiResponse.success(Collections.emptyList(), "Empty query."));
        }
        String q = query.toLowerCase().trim();
        List<TechnologyEvent> events = technologyEventRepository.findAll();
        List<com.techpulse.agent.dto.SearchResultDTO> results = new ArrayList<>();
        
        for (TechnologyEvent event : events) {
            double score = 0.0;
            List<String> reasons = new ArrayList<>();
            if (event.getTitle() != null && event.getTitle().toLowerCase().contains(q)) {
                score += 10.0;
                reasons.add("Title match");
            }
            if (event.getSummary() != null && event.getSummary().toLowerCase().contains(q)) {
                score += 5.0;
                reasons.add("Summary match");
            }
            List<String> topics = parseJsonList(event.getEntitiesJson());
            for (String topic : topics) {
                if (topic.toLowerCase().contains(q)) {
                    score += 7.0;
                    reasons.add("Topic match: " + topic);
                }
            }
            
            if (score > 0.0) {
                results.add(com.techpulse.agent.dto.SearchResultDTO.builder()
                        .eventId(event.getId())
                        .title(event.getTitle())
                        .relevanceScore(score)
                        .matchReasons(reasons)
                        .build());
            }
        }
        
        results.sort((a, b) -> Double.compare(b.getRelevanceScore(), a.getRelevanceScore()));
        return ResponseEntity.ok(ApiResponse.success(results, "Search completed successfully."));
    }

    // ── Collections CRUD endpoints ──────────────────────────────────────────────────

    @GetMapping("/user/collections")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCollections() {
        Long userId = getRequiredUserId();
        List<UserCollection> collections = userCollectionRepository.findByUserId(userId);

        List<Map<String, Object>> response = collections.stream().map(coll -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", coll.getId());
            map.put("userId", coll.getUserId());
            map.put("name", coll.getName());
            map.put("description", coll.getDescription());
            map.put("isAutoUpdating", coll.getIsAutoUpdating());
            map.put("createdAt", coll.getCreatedAt().toString());

            // Fetch events in this collection
            List<CollectionEvent> collEvents = collectionEventRepository.findByCollectionId(coll.getId());
            List<String> eventIds = collEvents.stream().map(CollectionEvent::getEventId).collect(Collectors.toList());
            List<TechnologyEvent> events = technologyEventRepository.findAllById(eventIds);
            
            map.put("events", events.stream()
                    .map(event -> mapToFeedItem(event, userId))
                    .collect(Collectors.toList()));
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(response, "Collections fetched successfully."));
    }

    @PostMapping("/user/collections")
    public ResponseEntity<ApiResponse<UserCollection>> createCollection(@RequestBody Map<String, Object> request) {
        Long userId = getRequiredUserId();
        String name = (String) request.get("name");
        String description = (String) request.get("description");

        UserCollection coll = UserCollection.builder()
                .userId(userId)
                .name(name)
                .description(description)
                .isAutoUpdating(false)
                .createdAt(LocalDateTime.now())
                .build();

        userCollectionRepository.save(coll);
        return ResponseEntity.ok(ApiResponse.success(coll, "Collection created successfully."));
    }

    @PutMapping("/user/collections/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<UserCollection>> updateCollection(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        Long userId = getRequiredUserId();
        Optional<UserCollection> collOpt = userCollectionRepository.findById(id);

        if (collOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        UserCollection coll = collOpt.get();
        if (!coll.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String name = (String) request.get("name");
        String description = (String) request.get("description");

        if (name != null) coll.setName(name);
        if (description != null) coll.setDescription(description);

        userCollectionRepository.save(coll);
        return ResponseEntity.ok(ApiResponse.success(coll, "Collection updated successfully."));
    }

    @DeleteMapping("/user/collections/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteCollection(@PathVariable Long id) {
        Long userId = getRequiredUserId();
        Optional<UserCollection> collOpt = userCollectionRepository.findById(id);

        if (collOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        UserCollection coll = collOpt.get();
        if (!coll.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        userCollectionRepository.delete(coll);
        return ResponseEntity.ok(ApiResponse.success(null, "Collection deleted successfully."));
    }

    @PostMapping("/user/collections/{collectionId}/events")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> addEventToCollection(
            @PathVariable Long collectionId,
            @RequestBody Map<String, String> request) {
        Long userId = getRequiredUserId();
        Optional<UserCollection> collOpt = userCollectionRepository.findById(collectionId);

        if (collOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        if (!collOpt.get().getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String eventId = request.get("eventId");
        CollectionEventId id = new CollectionEventId(collectionId, eventId);
        
        if (!collectionEventRepository.existsById(id)) {
            CollectionEvent item = CollectionEvent.builder()
                    .collectionId(collectionId)
                    .eventId(eventId)
                    .addedAt(LocalDateTime.now())
                    .build();
            collectionEventRepository.save(item);
        }

        return ResponseEntity.ok(ApiResponse.success(null, "Event added to collection."));
    }

    @DeleteMapping("/user/collections/{collectionId}/events/{eventId}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> removeEventFromCollection(
            @PathVariable Long collectionId,
            @PathVariable String eventId) {
        Long userId = getRequiredUserId();
        Optional<UserCollection> collOpt = userCollectionRepository.findById(collectionId);

        if (collOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        if (!collOpt.get().getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        CollectionEventId id = new CollectionEventId(collectionId, eventId);
        collectionEventRepository.findById(id).ifPresent(collectionEventRepository::delete);

        return ResponseEntity.ok(ApiResponse.success(null, "Event removed from collection."));
    }

    // ── Helper Caching and Filtering ────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private List<TechnologyEvent> getCachedPersonalizedFeed(Long userId) {
        String cacheKey = userId == null ? "guest" : String.valueOf(userId);
        
        try {
            Cache cache = cacheManager.getCache("personalizedFeed");
            if (cache != null) {
                Cache.ValueWrapper wrapper = cache.get(cacheKey);
                if (wrapper != null && wrapper.get() instanceof List) {
                    return (List<TechnologyEvent>) wrapper.get();
                }
            }
        } catch (Exception e) {
            log.error("[PersonalizationController] Redis cache read failed: {}. Falling back to database.", e.getMessage());
        }

        // Single-flight synchronization to protect against cache stampede
        Object lock = feedLocks.computeIfAbsent(cacheKey, k -> new Object());
        synchronized (lock) {
            // Double check
            try {
                Cache cache = cacheManager.getCache("personalizedFeed");
                if (cache != null) {
                    Cache.ValueWrapper wrapper = cache.get(cacheKey);
                    if (wrapper != null && wrapper.get() instanceof List) {
                        return (List<TechnologyEvent>) wrapper.get();
                    }
                }
            } catch (Exception e) {
                // Ignore, fallback to DB
            }

            log.info("[PersonalizationController] Cache miss for personalized feed: {}. Fetching & ranking from database...", cacheKey);
            List<TechnologyEvent> candidates = technologyEventRepository.findAll();
            List<TechnologyEvent> ranked = personalizationService.rankEvents(userId, candidates);

            try {
                Cache cache = cacheManager.getCache("personalizedFeed");
                if (cache != null) {
                    cache.put(cacheKey, ranked);
                }
            } catch (Exception e) {
                log.error("[PersonalizationController] Redis cache write failed: {}", e.getMessage());
            }
            return ranked;
        }
    }

    private void evictFeedCache(Long userId) {
        try {
            Cache cache = cacheManager.getCache("personalizedFeed");
            if (cache != null) {
                if (userId != null) {
                    cache.evict(String.valueOf(userId));
                }
                cache.evict("guest");
            }
        } catch (Exception e) {
            log.error("[PersonalizationController] Redis cache eviction failed: {}", e.getMessage());
        }
    }

    private boolean filterByCategory(TechnologyEvent event, String category) {
        if (category == null || category.trim().isEmpty() || "all".equalsIgnoreCase(category.trim())) {
            return true;
        }
        List<String> list = parseJsonList(event.getCategoriesJson());
        return list.stream().anyMatch(c -> c.equalsIgnoreCase(category.trim()));
    }

    private boolean filterByTech(TechnologyEvent event, String tech) {
        if (tech == null || tech.trim().isEmpty() || "all".equalsIgnoreCase(tech.trim())) {
            return true;
        }
        List<String> list = parseJsonList(event.getEntitiesJson());
        return list.stream().anyMatch(t -> t.equalsIgnoreCase(tech.trim()));
    }

    private Map<String, Object> mapToFeedItem(TechnologyEvent event, Long userId) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", event.getId());
        map.put("eventId", event.getId());
        map.put("headline", event.getTitle());
        map.put("summary", event.getSummary() != null ? event.getSummary() : "");
        map.put("publishedTime", event.getFirstSeen() != null ? event.getFirstSeen().toString() : LocalDateTime.now().toString());
        map.put("sourceName", "TechCrunch"); // default source template matching RN cards

        String sourceUrl = "";
        List<String> links = parseJsonList(event.getOfficialLinksJson());
        if (!links.isEmpty()) {
            sourceUrl = links.get(0);
        }
        map.put("sourceUrl", sourceUrl);

        map.put("importanceScore", event.getImportanceScore() != null ? event.getImportanceScore() : 70.0);
        map.put("credibilityScore", event.getCredibilityScore() != null ? event.getCredibilityScore() : 80.0);

        List<String> categories = parseJsonList(event.getCategoriesJson());
        map.put("category", categories.isEmpty() ? "Emerging Tech" : categories.get(0));

        List<String> entities = parseJsonList(event.getEntitiesJson());
        map.put("technology", entities.isEmpty() ? "General" : entities.get(0));

        map.put("version", event.getVersionString());
        map.put("releaseStatus", event.getLifecycleStatus());
        map.put("trendStatus", "RISING");

        boolean bookmarked = false;
        boolean read = false;

        if (userId != null) {
            bookmarked = userSavedEventRepository.existsById(new UserSavedEventId(userId, event.getId()));
            Optional<UserHistoryLog> history = userHistoryLogRepository.findByUserIdAndEventId(userId, event.getId());
            read = history.isPresent() && history.get().getCompletionPercentage() != null && history.get().getCompletionPercentage() >= 100;
        }

        map.put("bookmarked", bookmarked);
        map.put("read", read);
        map.put("recommendationReason", "Matching your interests.");

        return map;
    }

    private List<String> parseJsonList(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            String clean = json.replace("[", "").replace("]", "").replace("\"", "");
            if (clean.trim().isEmpty()) {
                return Collections.emptyList();
            }
            return Arrays.stream(clean.split(","))
                    .map(String::trim)
                    .toList();
        }
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
