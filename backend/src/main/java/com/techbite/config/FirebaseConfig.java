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
                // Try to load from classpath (where you put the file)
                var stream = getClass().getClassLoader().getResourceAsStream("firebase-adminsdk.json");
                
                GoogleCredentials credentials;
                if (stream != null) {
                    credentials = GoogleCredentials.fromStream(stream);
                } else {
                    // Fallback to environment variables (for Render)
                    credentials = GoogleCredentials.getApplicationDefault();
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
