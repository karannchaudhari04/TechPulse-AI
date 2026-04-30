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
                GoogleCredentials credentials;
                String jsonConfig = System.getenv("FIREBASE_SERVICE_ACCOUNT_JSON");
                var stream = getClass().getClassLoader().getResourceAsStream("firebase-adminsdk.json");
                
                if (jsonConfig != null && !jsonConfig.isEmpty()) {
                    // Load directly from the Environment Variable string (Render)
                    credentials = GoogleCredentials.fromStream(new java.io.ByteArrayInputStream(jsonConfig.getBytes()));
                    System.out.println("Firebase Auth: Loaded from FIREBASE_SERVICE_ACCOUNT_JSON environment variable.");
                } else if (stream != null) {
                    // Load from local file
                    credentials = GoogleCredentials.fromStream(stream);
                    System.out.println("Firebase Auth: Loaded from classpath file.");
                } else {
                    // Fallback to defaults
                    credentials = GoogleCredentials.getApplicationDefault();
                    System.out.println("Firebase Auth: Loaded from application default credentials.");
                }

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(credentials)
                        .build();
                FirebaseApp.initializeApp(options);
                System.out.println("Firebase Auth initialized successfully.");
            }
        } catch (IOException e) {
            System.err.println("Firebase Auth initialization failed: " + e.getMessage());
        }
    }
}
