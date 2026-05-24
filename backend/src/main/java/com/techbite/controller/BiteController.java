package com.techbite.controller;

import com.techbite.dto.ApiResponse;
import com.techbite.dto.BiteResponseDTO;
import com.techbite.dto.CursorPageResponse;
import com.techbite.model.Bite;
import com.techbite.model.User;
import com.techbite.repository.BiteRepository;
import com.techbite.repository.UserRepository;
import com.techbite.service.BiteService;
import com.techbite.service.NewsIngestionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/bites")
@Validated
public class BiteController {
    private static final Logger log = LoggerFactory.getLogger(BiteController.class);

    private final BiteService biteService;
    private final NewsIngestionService newsIngestionService;
    private final UserRepository userRepository;
    private final BiteRepository biteRepository;

    public BiteController(BiteService biteService, 
                          NewsIngestionService newsIngestionService,
                          UserRepository userRepository,
                          BiteRepository biteRepository) {
        this.biteService = biteService;
        this.newsIngestionService = newsIngestionService;
        this.userRepository = userRepository;
        this.biteRepository = biteRepository;
    }


    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> getBiteCount() {
        return ResponseEntity.ok(ApiResponse.success(biteRepository.count(), "Total bites in DB"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<CursorPageResponse<BiteResponseDTO>>> getAllBites(
            @AuthenticationPrincipal String firebaseUid,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "10") int limit) {
        
        User user = userRepository.findByFirebaseUid(firebaseUid).orElse(null);
        CursorPageResponse<BiteResponseDTO> bites = biteService.getAllBites(user, cursor, limit);
        return ResponseEntity.ok(ApiResponse.success(bites, "Feed fetched successfully"));
    }

    @GetMapping("/foryou")
    public ResponseEntity<ApiResponse<CursorPageResponse<BiteResponseDTO>>> getForYouFeed(
            @AuthenticationPrincipal String firebaseUid,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "10") int limit) {
        
        User user = userRepository.findByFirebaseUid(firebaseUid).orElse(null);
        CursorPageResponse<BiteResponseDTO> bites = biteService.getPersonalizedFeed(user, cursor, limit);
        return ResponseEntity.ok(ApiResponse.success(bites, "Personalized feed fetched"));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<CursorPageResponse<BiteResponseDTO>>> getBitesByCategory(
            @AuthenticationPrincipal String firebaseUid,
            @PathVariable Long categoryId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "10") int limit) {
        
        User user = userRepository.findByFirebaseUid(firebaseUid).orElse(null);
        CursorPageResponse<BiteResponseDTO> bites = biteService.getBitesByCategory(user, categoryId, cursor, limit);
        return ResponseEntity.ok(ApiResponse.success(bites, "Category feed fetched"));
    }

    @PostMapping("/{id}/like")
    @Transactional
    public ResponseEntity<ApiResponse<Integer>> likeBite(
            @AuthenticationPrincipal String firebaseUid,
            @PathVariable Long id) {
        
        User user = userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Bite bite = biteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bite not found"));
        
        int currentCount = (bite.getEngagementCount() == null ? 0 : bite.getEngagementCount());

        if (user.getLikedBites().contains(bite)) {
            // UNLIKE: Remove from user's list and decrement count
            user.getLikedBites().remove(bite);
            bite.setEngagementCount(Math.max(0, currentCount - 1));
            userRepository.save(user);
            biteRepository.save(bite);
            return ResponseEntity.ok(ApiResponse.success(bite.getEngagementCount(), "Bite unliked"));
        }
        
        // LIKE: Add to user's list and increment count
        user.getLikedBites().add(bite);
        bite.setEngagementCount(currentCount + 1);
        
        userRepository.save(user);
        biteRepository.save(bite);
        
        return ResponseEntity.ok(ApiResponse.success(bite.getEngagementCount(), "Bite liked"));
    }


    // ── Admin Endpoints for News Ingestion ───────────────────────────────────

    @PostMapping("/admin/news/ingest")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Object>> ingestNews() { 
        log.info(">>> [BiteController] Triggering async ingestion...");
        newsIngestionService.ingestAllFeeds();
        return ResponseEntity.ok(ApiResponse.success(null, "Ingestion triggered in background"));
    }

    @GetMapping("/admin/news/ingest/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getIngestStatus() {
        return ResponseEntity.ok(ApiResponse.success(newsIngestionService.getStatus(), "Status retrieved"));
    }

    @PostMapping("/admin/re-summarize")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> reSummarizeAll() {
        log.info(">>> [BiteController] Triggering async re-summarization of all bites...");
        // Running this in a separate thread because it can be slow
        new Thread(() -> {
            biteService.reSummarizeAllBites();
        }).start();
        return ResponseEntity.ok(ApiResponse.success(null, "Re-summarization started in background"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BiteResponseDTO>> getBiteById(
            @AuthenticationPrincipal String firebaseUid,
            @PathVariable Long id) {
        User user = firebaseUid != null ? userRepository.findByFirebaseUid(firebaseUid).orElse(null) : null;
        BiteResponseDTO bite = biteService.getBiteById(user, id);
        return ResponseEntity.ok(ApiResponse.success(bite, "Bite fetched successfully"));
    }

    @GetMapping("/explain")
    public ResponseEntity<ApiResponse<String>> explainBiteGet(@RequestParam Long biteId) {
        if (biteId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("biteId is required"));
        }
        String explanation = biteService.explainSimply(biteId);
        return ResponseEntity.ok(ApiResponse.success(explanation, "Bite explained successfully"));
    }

    @PostMapping("/explain")
    public ResponseEntity<ApiResponse<Map<String, String>>> explainBitePost(@RequestBody Map<String, Long> payload) {
        Long biteId = payload.get("biteId");
        if (biteId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("biteId is required"));
        }
        String explanation = biteService.explainSimply(biteId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("explanation", explanation), "Bite explained successfully"));
    }
}
