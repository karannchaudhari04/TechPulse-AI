package com.techpulse.agent.util;

/**
 * Helper utility calculating Jaro-Winkler text similarity metrics.
 */
public class JaroWinklerSimilarity {

    /**
     * Calculates the Jaro-Winkler similarity score between two strings.
     * Returns a score between 0.0 and 1.0 (rounded to two decimal places).
     */
    public static double calculate(String s1, String s2) {
        if (s1 == null || s2 == null) {
            return 0.0;
        }
        if (s1.equals(s2)) {
            return 1.0;
        }

        s1 = s1.trim();
        s2 = s2.trim();
        if (s1.isEmpty() || s2.isEmpty()) {
            return 0.0;
        }

        int len1 = s1.length();
        int len2 = s2.length();
        int matchWindow = Math.max(0, Math.max(len1, len2) / 2 - 1);

        boolean[] matches1 = new boolean[len1];
        boolean[] matches2 = new boolean[len2];

        int matchesCount = 0;
        for (int i = 0; i < len1; i++) {
            int start = Math.max(0, i - matchWindow);
            int end = Math.min(len2 - 1, i + matchWindow);

            for (int j = start; j <= end; j++) {
                if (!matches2[j] && s1.charAt(i) == s2.charAt(j)) {
                    matches1[i] = true;
                    matches2[j] = true;
                    matchesCount++;
                    break;
                }
            }
        }

        if (matchesCount == 0) {
            return 0.0;
        }

        // Transpositions count
        int transpositions = 0;
        int k = 0;
        for (int i = 0; i < len1; i++) {
            if (matches1[i]) {
                while (!matches2[k]) {
                    k++;
                }
                if (s1.charAt(i) != s2.charAt(k)) {
                    transpositions++;
                }
                k++;
            }
        }

        double jaro = (1.0 / 3.0) * (
            ((double) matchesCount / len1) +
            ((double) matchesCount / len2) +
            ((double) (matchesCount - transpositions / 2) / matchesCount)
        );

        // Winkler prefix scaling (scaling factor p = 0.1, max prefix length = 4)
        int prefixLen = 0;
        for (int i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
            if (s1.charAt(i) == s2.charAt(i)) {
                prefixLen++;
            } else {
                break;
            }
        }

        double jaroWinkler = jaro + 0.1 * prefixLen * (1.0 - jaro);
        return Math.round(jaroWinkler * 100.0) / 100.0;
    }
}
