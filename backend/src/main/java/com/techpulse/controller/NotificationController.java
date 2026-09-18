package com.techpulse.controller;

import com.techpulse.dto.ApiResponse;
import com.techpulse.model.NotificationEvent;
import com.techpulse.model.User;
import com.techpulse.repository.NotificationEventRepository;
import com.techpulse.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationEventRepository notificationEventRepository;
    private final UserRepository userRepository;

    public NotificationController(NotificationEventRepository notificationEventRepository, UserRepository userRepository) {
        this.notificationEventRepository = notificationEventRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getNotifications() {
        Long userId = getOptionalUserId();
        if (userId == null) {
            return ResponseEntity.ok(ApiResponse.success(Collections.emptyList(), "No notifications for guest"));
        }

        List<NotificationEvent> events = notificationEventRepository.findByUserIdOrderBySentAtDesc(userId);
        List<Map<String, Object>> items = events.stream().map(this::mapToNotificationItem).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(items, "Notifications fetched successfully"));
    }

    @GetMapping("/unread")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUnreadCount() {
        Long userId = getOptionalUserId();
        long count = 0;
        if (userId != null) {
            count = notificationEventRepository.countByUserIdAndIsReadFalse(userId);
        }
        Map<String, Object> data = new HashMap<>();
        data.put("count", count);
        return ResponseEntity.ok(ApiResponse.success(data, "Unread count fetched successfully"));
    }

    @PutMapping("/{id}/read")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        Long userId = getRequiredUserId();
        notificationEventRepository.findById(id).ifPresent(event -> {
            if (event.getUserId().equals(userId)) {
                event.setIsRead(true);
                notificationEventRepository.save(event);
            }
        });
        return ResponseEntity.ok(ApiResponse.success(null, "Notification marked as read"));
    }

    @PutMapping("/read-all")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        Long userId = getRequiredUserId();
        notificationEventRepository.markAllAsReadForUser(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "All notifications marked as read"));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long id) {
        Long userId = getRequiredUserId();
        notificationEventRepository.findById(id).ifPresent(event -> {
            if (event.getUserId().equals(userId)) {
                notificationEventRepository.delete(event);
            }
        });
        return ResponseEntity.ok(ApiResponse.success(null, "Notification deleted"));
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<ApiResponse<Void>> clearAllNotifications() {
        Long userId = getRequiredUserId();
        notificationEventRepository.deleteByUserId(userId);
        return ResponseEntity.ok(ApiResponse.success(null, "All notifications cleared"));
    }

    @GetMapping("/preferences")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getNotificationPreferences() {
        Map<String, Object> prefs = new HashMap<>();
        prefs.put("breakingNews", true);
        prefs.put("securityAlerts", true);
        prefs.put("aiReleases", true);
        prefs.put("frameworkUpdates", true);
        prefs.put("dailyDigest", true);
        prefs.put("weeklyDigest", false);
        prefs.put("emailEnabled", true);
        prefs.put("pushEnabled", true);
        prefs.put("frequency", "IMMEDIATE");
        prefs.put("maxNotificationsPerDay", 10);
        return ResponseEntity.ok(ApiResponse.success(prefs, "Notification preferences fetched"));
    }

    @PostMapping("/preferences")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateNotificationPreferences(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.success(body, "Notification preferences updated"));
    }

    private Map<String, Object> mapToNotificationItem(NotificationEvent event) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", String.valueOf(event.getId()));
        map.put("title", event.getTitle());
        map.put("message", event.getMessage());
        map.put("type", "BREAKING");
        map.put("priority", event.getPriority() != null ? event.getPriority() : "NORMAL");
        map.put("read", Boolean.TRUE.equals(event.getIsRead()));
        map.put("createdAt", event.getSentAt() != null ? event.getSentAt().toString() : LocalDateTime.now().toString());
        if (event.getEventId() != null) {
            Map<String, String> payload = new HashMap<>();
            payload.put("eventId", event.getEventId());
            map.put("payload", payload);
        }
        return map;
    }

    private Long getRequiredUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new RuntimeException("Not authenticated");
        Object principal = auth.getPrincipal();
        if (principal instanceof User user) return user.getId();
        if (principal instanceof String uid && !uid.equals("anonymousUser")) {
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
