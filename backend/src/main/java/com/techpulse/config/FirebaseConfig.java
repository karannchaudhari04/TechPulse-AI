package com.techpulse.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;

@Configuration
public class FirebaseConfig {
    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.credentials.path:}")
    private String credentialsPath;

    @PostConstruct
    public void initialize() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                GoogleCredentials credentials = null;
                String jsonConfig = System.getenv("FIREBASE_SERVICE_ACCOUNT_JSON");
                
                // 1. Try environment variable (JSON string) - standard for production/Render
                if (jsonConfig != null && !jsonConfig.isEmpty()) {
                    credentials = GoogleCredentials.fromStream(new java.io.ByteArrayInputStream(jsonConfig.getBytes()));
                    System.out.println("Firebase Auth: Loaded from FIREBASE_SERVICE_ACCOUNT_JSON environment variable.");
                } 
                // 2. Try configured external file path
                else if (credentialsPath != null && !credentialsPath.isEmpty()) {
                    java.io.File file = new java.io.File(credentialsPath);
                    if (file.exists() && file.canRead()) {
                        credentials = GoogleCredentials.fromStream(new java.io.FileInputStream(file));
                        System.out.println("Firebase Auth: Loaded from configured file path: " + credentialsPath);
                    } else {
                        log.warn("Firebase Auth: Configured file path was not found or is not readable: " + credentialsPath);
                    }
                }
                
                // 3. Fallback to classpath resource (local development)
                if (credentials == null) {
                    var stream = getClass().getClassLoader().getResourceAsStream("firebase-adminsdk.json");
                    if (stream != null) {
                        credentials = GoogleCredentials.fromStream(stream);
                        System.out.println("Firebase Auth: Loaded from classpath fallback file (firebase-adminsdk.json).");
                    }
                }

                if (credentials == null) {
                    log.error("🛑 FIREBASE ERROR: No credentials found! Set FIREBASE_SERVICE_ACCOUNT_JSON, configure firebase.credentials.path, or provide classpath file.");
                    return;
                }

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(credentials)
                        .build();
                FirebaseApp.initializeApp(options);
                System.out.println("Firebase Auth initialized successfully.");
            }
        } catch (Exception e) {
            System.err.println("🛑 Firebase Auth initialization failed: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
