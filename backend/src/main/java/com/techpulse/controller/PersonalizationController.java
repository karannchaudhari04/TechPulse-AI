package com.techpulse.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.dto.ApiResponse;
import com.techpulse.dto.CursorPageResponse;
import com.techpulse.dto.PageResponse;
import com.techpulse.model.*;
import com.techpulse.repository.*;
import com.techpulse.agent.PersonalizationAgent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1")
public class PersonalizationController {

    private static final Logger log = LoggerFactory.getLogger(PersonalizationController.class);

    private final TechnologyEventRepository technologyEventRepository;
    private final RawIngestionRepository rawIngestionRepository;
    private final UserSavedEventRepository userSavedEventRepository;
    private final UserHistoryLogRepository userHistoryLogRepository;
    private final UserCollectionRepository userCollectionRepository;
    private final CollectionEventRepository collectionEventRepository;
    private final UserFollowRepository userFollowRepository;
    private final UserRepository userRepository;
    private final InteractionLogRepository interactionLogRepository;
    private final PersonalizationAgent personalizationService;
    private final CacheManager cacheManager;
    private final ObjectMapper objectMapper;

    public PersonalizationController(TechnologyEventRepository technologyEventRepository,
                                     RawIngestionRepository rawIngestionRepository,
                                     UserSavedEventRepository userSavedEventRepository,
                                     UserHistoryLogRepository userHistoryLogRepository,
                                     UserCollectionRepository userCollectionRepository,
                                     CollectionEventRepository collectionEventRepository,
                                     UserFollowRepository userFollowRepository,
                                     UserRepository userRepository,
                                     InteractionLogRepository interactionLogRepository,
                                     PersonalizationAgent personalizationService,
                                     CacheManager cacheManager) {
        this.technologyEventRepository = technologyEventRepository;
        this.rawIngestionRepository = rawIngestionRepository;
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
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<CursorPageResponse<Map<String, Object>>>> getFeed(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tech) {

        Long userId = getOptionalUserId();
        int pageSize = Math.max(1, Math.min(limit, 50));
        FeedCursor feedCursor = decodeFeedCursor(cursor);
        List<TechnologyEvent> candidates = getCachedFeedPage(category, tech, feedCursor, pageSize + 1);
        boolean hasNext = candidates.size() > pageSize;
        List<TechnologyEvent> pageContent = hasNext
                ? candidates.subList(0, pageSize)
                : candidates;
        String nextCursor = pageContent.isEmpty() ? null : encodeFeedCursor(pageContent.get(pageContent.size() - 1));

        List<Map<String, Object>> mappedContent = mapToFeedItems(pageContent, userId);

        CursorPageResponse<Map<String, Object>> response = new CursorPageResponse<>(mappedContent, nextCursor, hasNext);
        return ResponseEntity.ok(ApiResponse.success(response, "Feed fetched successfully."));
    }

    @GetMapping("/feed/trending")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTrendingFeed() {
        Long userId = getOptionalUserId();
        List<TechnologyEvent> events = technologyEventRepository.findTop20ByOrderByFetchedAtDescIdDesc();
        List<Map<String, Object>> response = mapToFeedItems(events, userId);

        return ResponseEntity.ok(ApiResponse.success(response, "Trending feed fetched successfully."));
    }

    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTrends() {
        Long userId = getOptionalUserId();
        Map<String, Integer> topicCounts = getCachedTopicCounts();

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

        Set<String> followedTopics = userId == null ? Collections.emptySet()
                : userFollowRepository.findByUserIdAndEntityType(userId, "TOPIC").stream()
                        .map(UserFollow::getEntityName)
                        .collect(Collectors.toSet());
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
                    boolean following = finalPreferred.contains(entry.getKey()) || followedTopics.contains(entry.getKey());
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
        return ResponseEntity.ok(ApiResponse.success(null, "Interaction recorded successfully."));
    }

    @GetMapping("/user/bookmarks")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getBookmarks() {
        Long userId = getRequiredUserId();
        List<UserSavedEvent> saved = userSavedEventRepository.findByUserId(userId);
        List<String> eventIds = saved.stream().map(UserSavedEvent::getEventId).collect(Collectors.toList());
        List<TechnologyEvent> events = technologyEventRepository.findAllById(eventIds);

        List<Map<String, Object>> mapped = mapToFeedItems(events, userId);

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
        }

        return ResponseEntity.ok(ApiResponse.success(null, "Event bookmarked successfully."));
    }

    @DeleteMapping("/user/bookmark/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteBookmark(@PathVariable("id") String eventId) {
        Long userId = getRequiredUserId();
        UserSavedEventId id = new UserSavedEventId(userId, eventId);
        userSavedEventRepository.findById(id).ifPresent(userSavedEventRepository::delete);
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
                .map(event -> {
                    Map<String, Object> eventDetails = mapToFeedItem(event, userId);
                    String articleUrl = rawIngestionRepository.findFirstByEventIdOrderByFetchedAtDesc(id)
                            .map(RawIngestion::getUrl)
                            .filter(url -> url != null && !url.isBlank())
                            .orElseGet(() -> {
                                List<String> links = parseJsonList(event.getOfficialLinksJson());
                                return links.isEmpty() ? "" : links.get(0);
                            });
                    eventDetails.put("articleUrl", articleUrl);
                    eventDetails.put("sourceUrl", articleUrl);
                    eventDetails.put("originalSourceUrl", articleUrl);
                    eventDetails.put("technicalImpact", event.getTechnicalImpact());
                    eventDetails.put("developerImpact", event.getDeveloperImpact());
                    eventDetails.put("enterpriseImpact", event.getEnterpriseImpact());
                    eventDetails.put("migrationNotes", event.getMigrationNotes());
                    eventDetails.put("breakingChanges", event.getBreakingChanges());
                    eventDetails.put("securityNotes", event.getSecurityNotes());
                    return ResponseEntity.ok(ApiResponse.success(eventDetails, "Event found."));
                })
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

        Map<String, TechnologyEvent> relatedCandidates = new LinkedHashMap<>();
        targetTopics.stream().limit(5).forEach(topic ->
                technologyEventRepository.findTop20ByIdNotAndEntitiesJsonContainingIgnoreCaseOrderByFetchedAtDescIdDesc(id, topic)
                        .forEach(event -> relatedCandidates.putIfAbsent(event.getId(), event)));
        List<TechnologyEvent> relatedEvents = personalizationService.sortNewestFirst(
                new ArrayList<>(relatedCandidates.values())).stream().limit(5).toList();
        List<Map<String, Object>> related = mapToFeedItems(relatedEvents, userId);

        return ResponseEntity.ok(ApiResponse.success(related, "Related events fetched successfully."));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<com.techpulse.agent.dto.SearchResultDTO>>> search(@RequestParam String query) {
        if (query == null || query.isBlank()) {
            return ResponseEntity.ok(ApiResponse.success(Collections.emptyList(), "Empty query."));
        }
        String q = query.toLowerCase().trim().replace("%", "").replace("_", "");
        if (q.length() > 100) q = q.substring(0, 100);
        if (q.isBlank()) return ResponseEntity.ok(ApiResponse.success(Collections.emptyList(), "Empty query."));
        List<TechnologyEvent> events = technologyEventRepository.searchCandidates(q, PageRequest.of(0, 100));
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
            
            map.put("events", mapToFeedItems(events, userId));
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

    // ── Bounded shared feed-page caching and cursor helpers ──────────────────────────

    @SuppressWarnings("unchecked")
    private List<TechnologyEvent> getCachedFeedPage(String category, String tech, FeedCursor cursor, int limit) {
        String categoryFilter = normalizeFilter(category);
        String techFilter = normalizeFilter(tech);
        String cursorKey = cursor == null ? "first" : cursor.fetchedAt() + ":" + cursor.eventId();
        String cacheKey = "feed-v3:" + UUID.nameUUIDFromBytes(
                (categoryFilter + "|" + techFilter + "|" + cursorKey + "|" + limit).getBytes(StandardCharsets.UTF_8));
        Cache cache = cacheManager.getCache("chronologicalFeed");
        if (cache != null) {
            try {
                Cache.ValueWrapper cached = cache.get(cacheKey);
                if (cached != null && cached.get() instanceof List<?> values
                        && values.stream().allMatch(TechnologyEvent.class::isInstance)) {
                    return (List<TechnologyEvent>) values;
                }
            } catch (Exception e) {
                log.warn("[PersonalizationController] Feed page cache read failed; querying database: {}", e.getMessage());
            }
        }

        List<TechnologyEvent> page = technologyEventRepository.findFeedPage(
                categoryFilter, techFilter,
                cursor == null ? null : cursor.fetchedAt(),
                cursor == null ? null : cursor.eventId(),
                PageRequest.of(0, limit));
        if (cache != null) {
            try {
                cache.put(cacheKey, page);
            } catch (Exception e) {
                log.warn("[PersonalizationController] Feed page cache write failed: {}", e.getMessage());
            }
        }
        return page;
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank() || "all".equalsIgnoreCase(value.trim())) return null;
        String normalized = value.trim().toLowerCase(Locale.ROOT).replace("%", "").replace("_", "");
        return normalized.isEmpty() ? null : normalized.substring(0, Math.min(100, normalized.length()));
    }

    private FeedCursor decodeFeedCursor(String token) {
        if (token == null || token.isBlank()) return null;
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\n", 2);
            if (parts.length == 2) return new FeedCursor(LocalDateTime.parse(parts[0]), parts[1]);
        } catch (IllegalArgumentException | DateTimeParseException ignored) {
            // Backward compatibility: older clients send the event ID as the cursor.
        }
        return technologyEventRepository.findById(token.trim())
                .map(event -> new FeedCursor(getFetchTime(event), event.getId()))
                .orElse(null);
    }

    private String encodeFeedCursor(TechnologyEvent event) {
        LocalDateTime fetchedAt = getFetchTime(event);
        if (fetchedAt == null) return event.getId();
        String value = fetchedAt + "\n" + event.getId();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private Map<String, Integer> getCachedTopicCounts() {
        Cache cache = cacheManager.getCache("trends");
        if (cache != null) {
            try {
                Cache.ValueWrapper value = cache.get("topic-counts-v1");
                if (value != null && value.get() instanceof Map<?, ?> cached) {
                    Map<String, Integer> counts = new HashMap<>();
                    cached.forEach((key, count) -> {
                        if (key instanceof String name && count instanceof Number number) counts.put(name, number.intValue());
                    });
                    return counts;
                }
            } catch (Exception e) {
                log.warn("[PersonalizationController] Trend cache read failed: {}", e.getMessage());
            }
        }

        Map<String, Integer> counts = new HashMap<>();
        for (TechnologyEvent event : technologyEventRepository.findAll()) {
            for (String topic : parseJsonList(event.getEntitiesJson())) counts.merge(topic, 1, Integer::sum);
        }
        if (cache != null) {
            try {
                cache.put("topic-counts-v1", counts);
            } catch (Exception e) {
                log.warn("[PersonalizationController] Trend cache write failed: {}", e.getMessage());
            }
        }
        return counts;
    }

    private List<Map<String, Object>> mapToFeedItems(List<TechnologyEvent> events, Long userId) {
        if (events.isEmpty()) return Collections.emptyList();
        List<String> eventIds = events.stream().map(TechnologyEvent::getId).toList();
        Map<String, String> sourceNames = new HashMap<>();
        for (RawIngestionRepository.EventSourceProjection source
                : rawIngestionRepository.findSourceNamesByEventIdInOrderByFetchedAtDesc(eventIds)) {
            if (source.getEventId() != null && source.getSourceName() != null && !source.getSourceName().isBlank()) {
                sourceNames.putIfAbsent(source.getEventId(), source.getSourceName());
            }
        }
        Set<String> bookmarkedIds = Collections.emptySet();
        Set<String> completedIds = Collections.emptySet();
        if (userId != null) {
            bookmarkedIds = new HashSet<>(userSavedEventRepository.findEventIdsByUserIdAndEventIdIn(userId, eventIds));
            completedIds = new HashSet<>(userHistoryLogRepository.findCompletedEventIdsByUserIdAndEventIdIn(userId, eventIds));
        }
        Set<String> finalBookmarkedIds = bookmarkedIds;
        Set<String> finalCompletedIds = completedIds;
        return events.stream()
                .map(event -> mapToFeedItem(event, finalBookmarkedIds.contains(event.getId()),
                        finalCompletedIds.contains(event.getId()), sourceNames.get(event.getId())))
                .collect(Collectors.toList());
    }

    private Map<String, Object> mapToFeedItem(TechnologyEvent event, Long userId) {
        return mapToFeedItems(List.of(event), userId).get(0);
    }

    private Map<String, Object> mapToFeedItem(TechnologyEvent event, boolean bookmarked, boolean read, String sourceName) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", event.getId());
        map.put("eventId", event.getId());
        map.put("headline", event.getTitle());
        map.put("title", event.getTitle());
        map.put("summary", event.getSummary() != null ? event.getSummary() : "");
        map.put("contentSummary", event.getSummary() != null ? event.getSummary() : "");
        map.put("publishedTime", event.getFirstSeen() != null ? event.getFirstSeen().toString() : "");
        map.put("fetchedAt", getFetchTime(event) != null ? getFetchTime(event).toString() : "");
        map.put("sourceName", sourceName != null ? sourceName : "Source");

        String sourceUrl = "";
        List<String> links = parseJsonList(event.getOfficialLinksJson());
        if (!links.isEmpty()) {
            sourceUrl = links.get(0);
        }
        map.put("sourceUrl", sourceUrl);
        map.put("originalSourceUrl", sourceUrl);

        map.put("importanceScore", event.getImportanceScore() != null ? event.getImportanceScore() : 70.0);
        map.put("credibilityScore", event.getCredibilityScore() != null ? event.getCredibilityScore() : 80.0);

        List<String> categories = parseJsonList(event.getCategoriesJson());
        String cat = categories.isEmpty() ? "Emerging Tech" : categories.get(0);
        map.put("category", cat);
        map.put("categoryName", cat);

        List<String> entities = parseJsonList(event.getEntitiesJson());
        map.put("technology", entities.isEmpty() ? "General" : entities.get(0));
        map.put("technologies", entities);

        map.put("version", event.getVersionString());
        map.put("releaseStatus", event.getLifecycleStatus());
        map.put("trendStatus", "RISING");

        map.put("bookmarked", bookmarked);
        map.put("read", read);
        return map;
    }

    private LocalDateTime getFetchTime(TechnologyEvent event) {
        if (event.getFetchedAt() != null) return event.getFetchedAt();
        if (event.getLastUpdated() != null) return event.getLastUpdated();
        return event.getFirstSeen();
    }

    private record FeedCursor(LocalDateTime fetchedAt, String eventId) {}

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
        if (auth == null || !auth.isAuthenticated()) throw new RuntimeException("Not authenticated");
        Object principal = auth.getPrincipal();
        if (principal instanceof User user) return user.getId();
        if (principal instanceof String uid && !uid.equals("anonymousUser")) {
            return userRepository.findByFirebaseUid(uid)
                    .map(User::getId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
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
