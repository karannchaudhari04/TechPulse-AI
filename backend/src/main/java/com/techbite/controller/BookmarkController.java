package com.techbite.controller;

import com.techbite.dto.ApiResponse;
import com.techbite.dto.BiteResponseDTO;
import com.techbite.model.Bite;
import com.techbite.model.Bookmark;
import com.techbite.model.User;
import com.techbite.repository.BiteRepository;
import com.techbite.repository.BookmarkRepository;
import com.techbite.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/bookmarks")
public class BookmarkController {

    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;
    private final BiteRepository biteRepository;

    public BookmarkController(BookmarkRepository bookmarkRepository,
                              UserRepository userRepository,
                              BiteRepository biteRepository) {
        this.bookmarkRepository = bookmarkRepository;
        this.userRepository = userRepository;
        this.biteRepository = biteRepository;
    }

    /**
     * Returns the authenticated user's bookmarked bites, paginated.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<BiteResponseDTO>>> getBookmarks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        User user = resolveUser();
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Bookmark> bookmarkPage = bookmarkRepository.findByUserId(user.getId(), pageRequest);
        Page<BiteResponseDTO> result = bookmarkPage.map(bm -> mapToDTO(bm.getBite()));

        return ResponseEntity.ok(ApiResponse.success(result, "Bookmarks fetched successfully"));
    }

    /**
     * Adds a bookmark. Idempotent — does nothing if already bookmarked.
     */
    @PostMapping("/{biteId}")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> addBookmark(@PathVariable Long biteId) {
        User user = resolveUser();

        if (bookmarkRepository.existsByUserIdAndBiteId(user.getId(), biteId)) {
            return ResponseEntity.ok(ApiResponse.success(
                    Map.of("bookmarked", true, "biteId", biteId), "Already bookmarked"));
        }

        Bite bite = biteRepository.findById(biteId)
                .orElseThrow(() -> new RuntimeException("Bite not found: " + biteId));

        Bookmark bookmark = new Bookmark();
        bookmark.setUser(user);
        bookmark.setBite(bite);
        bookmarkRepository.save(bookmark);

        return ResponseEntity.ok(ApiResponse.success(
                Map.of("bookmarked", true, "biteId", biteId), "Bookmark added"));
    }

    /**
     * Removes a bookmark.
     */
    @DeleteMapping("/{biteId}")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> removeBookmark(@PathVariable Long biteId) {
        User user = resolveUser();
        bookmarkRepository.deleteByUserIdAndBiteId(user.getId(), biteId);
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("bookmarked", false, "biteId", biteId), "Bookmark removed"));
    }

    /**
     * Check if a specific bite is bookmarked by the current user.
     */
    @GetMapping("/status/{biteId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkBookmark(@PathVariable Long biteId) {
        User user = resolveUser();
        boolean exists = bookmarkRepository.existsByUserIdAndBiteId(user.getId(), biteId);
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("bookmarked", exists, "biteId", biteId), "Status checked"));
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Resolves the authenticated Firebase UID to a User entity.
     * Auto-provisions a minimal User row on first access so that users who
     * bypassed /register-or-login (e.g. due to a transient error) aren't
     * permanently blocked by a "User not found" 500.
     */
    @Transactional
    private User resolveUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof String uid)) {
            throw new RuntimeException("Not authenticated");
        }
        return userRepository.findByFirebaseUid(uid).orElseGet(() -> {
            User newUser = new User();
            newUser.setFirebaseUid(uid);
            newUser.setEmail(uid + "@firebase.user");
            return userRepository.save(newUser);
        });
    }

    private BiteResponseDTO mapToDTO(Bite bite) {
        return BiteResponseDTO.builder()
                .id(bite.getId())
                .title(bite.getTitle())
                .contentSummary(bite.getContentSummary())
                .originalSourceUrl(bite.getOriginalSourceUrl())
                .authorAttribution(bite.getAuthorAttribution())
                .thumbnailUrl(bite.getThumbnailUrl())
                .categoryName(bite.getCategory() != null ? bite.getCategory().getName() : "Uncategorized")
                .publishedAt(bite.getPublishedAt())
                .build();
    }
}
