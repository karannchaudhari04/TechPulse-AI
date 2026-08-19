package com.techpulse.common;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

public class HashUtil {

    private static final Set<String> STOP_WORDS = Set.of(
        "the", "a", "an", "in", "on", "at", "for", "with", "is", "of", "to", "and", "or", "by", "that", "this", "it"
    );

    public static String sha256(String text) {
        if (text == null) return "";
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    public static String normalizeTitle(String title) {
        if (title == null) return "";
        return title.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    public static boolean hasTokenOverlap(String title1, String title2) {
        String clean1 = normalizeTitle(title1);
        String clean2 = normalizeTitle(title2);

        Set<String> tokens1 = Arrays.stream(clean1.split(" "))
                .filter(t -> !t.isBlank() && !STOP_WORDS.contains(t))
                .collect(Collectors.toSet());

        Set<String> tokens2 = Arrays.stream(clean2.split(" "))
                .filter(t -> !t.isBlank() && !STOP_WORDS.contains(t))
                .collect(Collectors.toSet());

        tokens1.retainAll(tokens2);
        return tokens1.size() >= 2 || (tokens1.size() >= 1 && (tokens2.size() <= 3 || tokens1.size() == tokens2.size()));
    }
}
