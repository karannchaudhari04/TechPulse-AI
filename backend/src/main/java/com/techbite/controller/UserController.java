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

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final com.techbite.repository.UserRepository userRepository;
    private final com.techbite.repository.CategoryRepository categoryRepository;
    private final com.techbite.service.UserService userService;
    private final com.techbite.repository.BookmarkRepository bookmarkRepository;

    public UserController(com.techbite.repository.UserRepository userRepository, 
                          com.techbite.repository.CategoryRepository categoryRepository, 
                          com.techbite.service.UserService userService,
                          com.techbite.repository.BookmarkRepository bookmarkRepository) {
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.userService = userService;
        this.bookmarkRepository = bookmarkRepository;
    }

    /**
     * Called immediately after Firebase sign-in.
     * Upserts the user record in our DB and returns whether they've set preferences.
     */
    @PostMapping("/register-or-login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> registerOrLogin(
            @RequestBody Map<String, String> request) {

        String firebaseUid = getFirebaseUid();
        String email = request.get("email");
        String displayName = request.get("displayName");
        String photoUrl = request.get("photoUrl");

        // Delegate to service for atomic find-or-create logic
        User user = userService.syncUserWithBackend(firebaseUid, email, displayName, photoUrl);

        boolean hasPreferences = user.getPreferences() != null && !user.getPreferences().isEmpty();

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
        User user = getCurrentUser();

        List<String> categoryNames = request.get("categories");
        if (categoryNames == null || categoryNames.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("At least one category must be selected."));
        }

        Set<Category> oldPrefs = new HashSet<>(user.getPreferences());
        Set<String> lowerNames = categoryNames.stream().map(String::toLowerCase).collect(Collectors.toSet());
        Set<Category> newPrefs = categoryRepository.findByNameIgnoreCaseIn(lowerNames);
        
        // Increment for new follows
        for (Category c : newPrefs) {
            if (!oldPrefs.contains(c)) {
                c.setFollowerCount((c.getFollowerCount() == null ? 0 : c.getFollowerCount()) + 1);
                categoryRepository.save(c);
            }
        }
        
        // Decrement for unfollows
        for (Category c : oldPrefs) {
            if (!newPrefs.contains(c)) {
                long count = (c.getFollowerCount() == null ? 0 : c.getFollowerCount());
                c.setFollowerCount(Math.max(0, count - 1));
                categoryRepository.save(c);
            }
        }

        user.setPreferences(newPrefs);
        userRepository.save(user);
        userService.evictUserCache(firebaseUid);

        Map<String, Object> data = new HashMap<>();
        data.put("savedCount", newPrefs.size());
        data.put("categories", newPrefs.stream().map(Category::getName).collect(Collectors.toList()));

        return ResponseEntity.ok(ApiResponse.success(data, "Preferences saved successfully"));
    }

    /**
     * Returns the current user's selected category names.
     */
    @GetMapping("/preferences")
    public ResponseEntity<ApiResponse<List<String>>> getPreferences() {
        User user = getCurrentUser();

        List<String> names = user.getPreferences().stream()
                .map(Category::getName)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(names, "Preferences fetched successfully"));
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProfile() {
        User user = getCurrentUser();

        Map<String, Object> data = new HashMap<>();
        data.put("streakCount", user.getStreakCount());
        data.put("email", user.getEmail());
        data.put("displayName", user.getDisplayName());
        data.put("photoURL", user.getProfilePictureUrl());
        data.put("preferencesCount", user.getPreferences().size());
        data.put("savedBitesCount", bookmarkRepository.countByUserId(user.getId()));
        data.put("likedBitesCount", userRepository.countLikedBitesByUserId(user.getId()));
        data.put("role", user.getRole().name());

        return ResponseEntity.ok(ApiResponse.success(data, "Profile fetched successfully"));
    }

    @PostMapping("/streak/update")
    @Transactional
    public ResponseEntity<ApiResponse<Integer>> updateStreak(
            @RequestHeader(value = "X-User-Timezone", required = false) String userTimezone) {
        String firebaseUid = getFirebaseUid();
        User user = getCurrentUser();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastRead = user.getLastReadAt();
        
        // 1. Resolve client timezone with safe fallbacks
        java.time.ZoneId userZone = java.time.ZoneId.systemDefault();
        if (userTimezone != null && !userTimezone.isBlank()) {
            try {
                userZone = java.time.ZoneId.of(userTimezone);
            } catch (Exception e) {
                // Fallback to UTC if timezone is invalid
                userZone = java.time.ZoneId.of("UTC");
            }
        }

        // 2. Project current time into user's timezone date
        java.time.LocalDate nowLocalDate = java.time.LocalDate.now(userZone);
        
        if (lastRead == null) {
            // First time reading
            user.setStreakCount(1);
        } else {
            // 3. Project database timestamp (saved in server default timezone) into user's localized date
            java.time.ZonedDateTime lastReadZoned = lastRead.atZone(java.time.ZoneId.systemDefault());
            java.time.LocalDate lastReadLocalDate = lastReadZoned.withZoneSameInstant(userZone).toLocalDate();

            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(lastReadLocalDate, nowLocalDate);
            
            if (daysBetween == 1) {
                // Consecutive day in user's timezone!
                user.setStreakCount(user.getStreakCount() + 1);
            } else if (daysBetween > 1) {
                // Missed a day in user's timezone, reset
                user.setStreakCount(1);
            }
            // If daysBetween == 0, they already read today, so keep current streak
        }
        
        user.setLastReadAt(now);
        userRepository.save(user);
        userService.evictUserCache(firebaseUid);
        
        return ResponseEntity.ok(ApiResponse.success(user.getStreakCount(), "Streak updated"));
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            throw new RuntimeException("Not authenticated");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof User user) {
            return user;
        }
        if (principal instanceof String uid) {
            return userRepository.findByFirebaseUid(uid)
                    .orElseThrow(() -> new RuntimeException("User not found"));
        }
        throw new RuntimeException("Not authenticated");
    }

    private String getFirebaseUid() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            throw new RuntimeException("Not authenticated");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof User user) {
            return user.getFirebaseUid();
        }
        if (principal instanceof String uid) {
            return uid;
        }
        throw new RuntimeException("Not authenticated");
    }
}
