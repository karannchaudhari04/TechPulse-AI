package com.techbite.controller;

import com.techbite.dto.ApiResponse;
import com.techbite.dto.BiteResponseDTO;
import com.techbite.model.User;
import com.techbite.repository.UserRepository;
import com.techbite.service.BiteService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/bites")
public class BiteController {

    private final BiteService biteService; 
    private final UserRepository userRepository;

    public BiteController(BiteService biteService, UserRepository userRepository) {
        this.biteService = biteService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<BiteResponseDTO>>> getFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Long categoryId) {
        
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("publishedAt").descending());
        Page<BiteResponseDTO> bites = biteService.getFeed(pageRequest, categoryId);
        
        return ResponseEntity.ok(ApiResponse.success(bites, "Feed fetched successfully"));
    }

    @GetMapping("/foryou")
    public ResponseEntity<ApiResponse<Page<BiteResponseDTO>>> getForYouFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("publishedAt").descending());
        
        String firebaseUid = null;
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (principal instanceof String) {
                firebaseUid = (String) principal;
            }
        }
        
        Long internalUserId = null;
        if (firebaseUid != null) {
            Optional<User> userOpt = userRepository.findByFirebaseUid(firebaseUid);
            if (userOpt.isPresent()) {
                internalUserId = userOpt.get().getId();
            }
        }
        
        if (internalUserId != null) {
            Page<BiteResponseDTO> bites = biteService.getForYouFeed(internalUserId, pageRequest);
            return ResponseEntity.ok(ApiResponse.success(bites, "Personalized feed fetched"));
        } else {
            Page<BiteResponseDTO> bites = biteService.getFeed(pageRequest, null);
            return ResponseEntity.ok(ApiResponse.success(bites, "Generic feed fetched for guest"));
        }
    }

    @PostMapping("/explain")
    public ResponseEntity<ApiResponse<Map<String, String>>> explainBite(
            @RequestBody Map<String, Object> request) { 
        
        Object biteIdObj = request.get("biteId");
        String biteId = biteIdObj != null ? biteIdObj.toString() : "0";
        
        String summary = biteService.summarizeContent(biteId);
        
        return ResponseEntity.ok(ApiResponse.success(Map.of("explanation", summary), "Summary generated successfully"));
    }

    @PostMapping("/admin/summarize")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Object>> summarizeLink(
            @RequestBody Object summaryRequestDTO) { 
        return ResponseEntity.ok(ApiResponse.success(null, "Summary generated successfully"));
    }
}
