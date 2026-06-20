package com.techbite.service;

import com.techbite.model.User;
import com.techbite.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Random;

@Component
public class PushScheduler {

    private final UserRepository userRepository;
    private final PushNotificationService pushNotificationService;
    private final Random random = new Random();

    // A rich collection of randomized educational CS and system design hooks
    private static final List<String> HOOK_TITLES = List.of(
        "🧠 Daily System Design Challenge",
        "💻 Master System Design",
        "⚡ Daily CS Digest",
        "🚀 Developer Pro-Tip",
        "⚙️ Under the Hood",
        "🔥 Elevate Your Tech Game"
    );

    private static final List<String> HOOK_BODIES = List.of(
        "Do you know how TinyURL scales? Read the high-yield breakdown in 2 minutes.",
        "How do databases optimize read speeds using B-Trees? Find out now.",
        "Optimistic vs. Pessimistic Locking: when should you use each? Learn in 2 minutes.",
        "What is the CAP Theorem and how does it affect distributed databases? Read now.",
        "How do Content Delivery Networks (CDNs) cache static assets globally? Find out in 2 minutes.",
        "Ever wondered how JWT tokens are cryptographically signed? Let's break it down simply.",
        "How does Redis achieve sub-millisecond read/write latencies? Master it in 2 minutes.",
        "What are index lookups and why are composite keys so fast in SQL? Read now."
    );

    public PushScheduler(UserRepository userRepository, PushNotificationService pushNotificationService) {
        this.userRepository = userRepository;
        this.pushNotificationService = pushNotificationService;
    }

    // Runs daily at 9:00 AM server timezone
    @Scheduled(cron = "0 0 9 * * *")
    public void sendDailyCSDigest() {
        System.out.println("[PushScheduler] Preparing daily push notification campaign...");
        
        List<String> tokens = userRepository.findAllPushTokens();

        if (tokens.isEmpty()) {
            System.out.println("[PushScheduler] No registered push tokens found. Aborting campaign.");
            return;
        }

        // Pick a random title and body to keep engagement fresh and prevent notification fatigue
        String randomTitle = HOOK_TITLES.get(random.nextInt(HOOK_TITLES.size()));
        String randomBody = HOOK_BODIES.get(random.nextInt(HOOK_BODIES.size()));

        pushNotificationService.sendPushNotifications(tokens, randomTitle, randomBody);
    }
}
