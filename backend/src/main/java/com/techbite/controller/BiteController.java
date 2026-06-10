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
import java.util.List;
import java.util.Set;

import com.techbite.service.UserService;

@RestController
@RequestMapping("/api/v1/bites")
@Validated
public class BiteController {
    private static final Logger log = LoggerFactory.getLogger(BiteController.class);

    private final BiteService biteService;
    private final NewsIngestionService newsIngestionService;
    private final UserRepository userRepository;
    private final BiteRepository biteRepository;
    private final UserService userService;

    public BiteController(BiteService biteService, 
                          NewsIngestionService newsIngestionService,
                          UserRepository userRepository,
                          BiteRepository biteRepository,
                          UserService userService) {
        this.biteService = biteService;
        this.newsIngestionService = newsIngestionService;
        this.userRepository = userRepository;
        this.biteRepository = biteRepository;
        this.userService = userService;
    }


    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> getBiteCount() {
        return ResponseEntity.ok(ApiResponse.success(biteRepository.count(), "Total bites in DB"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<CursorPageResponse<BiteResponseDTO>>> getAllBites(
            @AuthenticationPrincipal Object principal,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "10") int limit) {
        
        User user = resolveUser(principal);
        CursorPageResponse<BiteResponseDTO> bites = biteService.getAllBites(user, cursor, limit);
        return ResponseEntity.ok(ApiResponse.success(bites, "Feed fetched successfully"));
    }

    @GetMapping("/foryou")
    public ResponseEntity<ApiResponse<CursorPageResponse<BiteResponseDTO>>> getForYouFeed(
            @AuthenticationPrincipal Object principal,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "10") int limit) {
        
        User user = resolveUser(principal);
        CursorPageResponse<BiteResponseDTO> bites = biteService.getPersonalizedFeed(user, cursor, limit);
        return ResponseEntity.ok(ApiResponse.success(bites, "Personalized feed fetched"));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<CursorPageResponse<BiteResponseDTO>>> getBitesByCategory(
            @AuthenticationPrincipal Object principal,
            @PathVariable Long categoryId,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "10") int limit) {
        
        User user = resolveUser(principal);
        CursorPageResponse<BiteResponseDTO> bites = biteService.getBitesByCategory(user, categoryId, cursor, limit);
        return ResponseEntity.ok(ApiResponse.success(bites, "Category feed fetched"));
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
            @AuthenticationPrincipal Object principal,
            @PathVariable Long id) {
        User user = resolveUser(principal);
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

    @PostMapping("/viewed")
    public ResponseEntity<ApiResponse<Void>> markBitesAsViewed(
            @AuthenticationPrincipal Object principal,
            @RequestBody Map<String, List<Long>> payload) {
        User user = resolveUser(principal);
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
        }
        List<Long> biteIds = payload.get("biteIds");
        if (biteIds != null && !biteIds.isEmpty()) {
            biteService.markBitesAsViewed(user, biteIds);
        }
        return ResponseEntity.ok(ApiResponse.success(null, "Bites marked as viewed"));
    }

    @GetMapping("/viewed")
    public ResponseEntity<ApiResponse<Set<Long>>> getViewedBiteIds(@AuthenticationPrincipal Object principal) {
        User user = resolveUser(principal);
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
        }
        Set<Long> viewedIds = biteService.getViewedBiteIds(user);
        return ResponseEntity.ok(ApiResponse.success(viewedIds, "Fetched viewed bite IDs"));
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private User resolveUser(Object principal) {
        if (principal instanceof User user) {
            return user;
        }
        if (principal instanceof String uid) {
            return userRepository.findByFirebaseUid(uid).orElse(null);
        }
        return null;
    }
}
