package com.techbite.controller;

import com.techbite.dto.ApiResponse;
import com.techbite.model.Category;
import com.techbite.model.User;
import com.techbite.repository.CategoryRepository;
import com.techbite.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

    public UserController(UserRepository userRepository, CategoryRepository categoryRepository) {
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
    }

    /**
     * Called immediately after Firebase sign-in.
     * Upserts the user record in our DB and returns whether they've set preferences.
     */
    @PostMapping("/register-or-login")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> registerOrLogin(
            @RequestBody Map<String, String> request) {

        String firebaseUid = getFirebaseUid();
        String email = request.get("email");
        String displayName = request.get("displayName");
        String photoUrl = request.get("photoUrl");

        User user = userRepository.findByFirebaseUid(firebaseUid).orElseGet(() -> {
            User newUser = new User();
            newUser.setFirebaseUid(firebaseUid);
            newUser.setEmail(email != null ? email : firebaseUid + "@unknown.com");
            return newUser;
        });

        // Always update profile fields on login
        if (displayName != null) user.setDisplayName(displayName);
        if (photoUrl != null) user.setProfilePictureUrl(photoUrl);
        if (email != null) user.setEmail(email);
        userRepository.save(user);

        boolean hasPreferences = !user.getPreferences().isEmpty();

        Map<String, Object> data = new HashMap<>();
        data.put("userId", user.getId());
        data.put("hasPreferences", hasPreferences);

        return ResponseEntity.ok(ApiResponse.success(data, "User registered/logged in successfully"));
    }

    /**
     * Saves user category preferences (replaces existing ones).
     * Accepts category names as strings; maps them to DB category records.
     */
    @PostMapping("/preferences")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> savePreferences(
            @RequestBody Map<String, List<String>> request) {

        String firebaseUid = getFirebaseUid();
        User user = userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found. Please sign in first."));

        List<String> categoryNames = request.get("categories");
        if (categoryNames == null || categoryNames.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("At least one category must be selected."));
        }

        // Find matching categories in DB (case-insensitive search)
        Set<Category> matched = categoryRepository.findByNameIn(new HashSet<>(categoryNames));
        user.setPreferences(matched);
        userRepository.save(user);

        Map<String, Object> data = new HashMap<>();
        data.put("savedCount", matched.size());
        data.put("categories", matched.stream().map(Category::getName).collect(Collectors.toList()));

        return ResponseEntity.ok(ApiResponse.success(data, "Preferences saved successfully"));
    }

    /**
     * Returns the current user's selected category names.
     */
    @GetMapping("/preferences")
    public ResponseEntity<ApiResponse<List<String>>> getPreferences() {
        String firebaseUid = getFirebaseUid();
        User user = userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new RuntimeException("User not found."));

        List<String> names = user.getPreferences().stream()
                .map(Category::getName)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(names, "Preferences fetched successfully"));
    }

    // ─── Helper ─────────────────────────────────────────────────────────────────

    private String getFirebaseUid() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof String uid)) {
            throw new RuntimeException("Not authenticated");
        }
        return uid;
    }
}
