package com.techbite.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class PushNotificationService {

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    public void sendPushNotifications(List<String> tokens, String title, String body) {
        if (tokens == null || tokens.isEmpty()) {
            return;
        }

        // Expo allows sending up to 100 notifications in a single batch request
        List<Map<String, Object>> messages = new ArrayList<>();
        for (String token : tokens) {
            if (token != null && !token.isBlank()) {
                Map<String, Object> message = new HashMap<>();
                message.put("to", token);
                message.put("sound", "default");
                message.put("title", title);
                message.put("body", body);
                
                Map<String, String> data = new HashMap<>();
                data.put("screen", "Home");
                message.put("data", data);
                
                messages.add(message);
            }
        }

        if (messages.isEmpty()) {
            return;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<List<Map<String, Object>>> request = new HttpEntity<>(messages, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(EXPO_PUSH_URL, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                System.out.println("[PushNotificationService] Successfully sent " + messages.size() + " push notifications via Expo.");
            } else {
                System.err.println("[PushNotificationService] Expo API responded with code: " + response.getStatusCode());
            }
        } catch (Exception e) {
            System.err.println("[PushNotificationService] Error sending push notifications: " + e.getMessage());
        }
    }
}
