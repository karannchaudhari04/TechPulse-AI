package com.techbite.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;
import java.io.IOException;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                // By default, uses GOOGLE_APPLICATION_CREDENTIALS env var
                // For local dev without creds, this might throw if not set, 
                // but we wrap it safely so the app can start and allow public feeds.
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.getApplicationDefault())
                        .build();
                FirebaseApp.initializeApp(options);
            }
        } catch (IOException e) {
            System.err.println("Firebase Auth initialization skipped: GOOGLE_APPLICATION_CREDENTIALS not found.");
            // We swallow this so public endpoints remain testable
        }
    }
}
