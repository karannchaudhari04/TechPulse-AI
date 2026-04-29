package com.techbite.controller;

import com.techbite.dto.ApiResponse;
import com.techbite.dto.BiteResponseDTO;
import com.techbite.model.User;
import com.techbite.repository.BiteRepository;
import com.techbite.repository.UserRepository;
import com.techbite.service.BiteService;
import com.techbite.service.NewsIngestionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/bites")
@Validated
public class BiteController {

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
    public ResponseEntity<ApiResponse<Page<BiteResponseDTO>>> getAllBites(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "publishedAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        
        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        PageRequest pageRequest = PageRequest.of(page, size, sort);
        Page<BiteResponseDTO> bites = biteService.getAllBites(pageRequest);
        return ResponseEntity.ok(ApiResponse.success(bites, "Feed fetched successfully"));
    }

    @GetMapping("/foryou")
    public ResponseEntity<ApiResponse<Page<BiteResponseDTO>>> getForYouFeed(
            @AuthenticationPrincipal String firebaseUid,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        User user = userRepository.findByFirebaseUid(firebaseUid).orElse(null);
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<BiteResponseDTO> bites = biteService.getPersonalizedFeed(user, pageRequest);
        return ResponseEntity.ok(ApiResponse.success(bites, "Personalized feed fetched"));
    }


    // ── Admin Endpoints for News Ingestion ───────────────────────────────────

    @PostMapping("/admin/news/ingest")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Object>> ingestNews() { 
        System.out.println(">>> [BiteController] Ingest endpoint hit!");
        // Trigger ingestion in a background thread to avoid blocking the request
        new Thread(newsIngestionService::ingestAllFeeds).start();
        return ResponseEntity.ok(ApiResponse.success(null, "Ingestion triggered in background"));
    }

    @GetMapping("/admin/news/ingest/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getIngestStatus() {
        return ResponseEntity.ok(ApiResponse.success(newsIngestionService.getStatus(), "Status retrieved"));
    }
}
