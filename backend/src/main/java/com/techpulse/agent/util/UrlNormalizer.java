package com.techpulse.agent.util;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

/**
 * Utility for robust URL normalization.
 */
public class UrlNormalizer {

    /**
     * Normalizes a URL: removes fragments, lowercases host, removes duplicate slashes,
     * strips trailing slashes, and removes tracking query parameters.
     */
    public static String normalize(String urlStr) {
        if (urlStr == null || urlStr.isBlank()) {
            return "";
        }
        try {
            // 1. Remove fragment
            int fragmentIndex = urlStr.indexOf('#');
            if (fragmentIndex != -1) {
                urlStr = urlStr.substring(0, fragmentIndex);
            }

            // 2. Parse URL using URI
            URI uri = new URI(urlStr.trim());
            String scheme = uri.getScheme();
            String host = uri.getHost();
            int port = uri.getPort();
            String path = uri.getPath();
            String query = uri.getQuery();

            if (scheme == null || host == null) {
                return urlStr;
            }

            // 3. Lowercase scheme and host
            scheme = scheme.toLowerCase();
            host = host.toLowerCase();

            // 4. Normalize path: remove duplicate slashes, strip trailing slash
            if (path != null) {
                path = path.replaceAll("/{2,}", "/"); // Duplicate slashes removal
                if (path.length() > 1 && path.endsWith("/")) {
                    path = path.substring(0, path.length() - 1); // Trailing slash removal
                }
            } else {
                path = "";
            }

            // 5. Clean query parameters: remove utm_*, fbclid, gclid
            if (query != null && !query.isBlank()) {
                String[] params = query.split("&");
                List<String> cleanParams = new ArrayList<>();
                for (String param : params) {
                    String[] pair = param.split("=", 2);
                    String key = pair[0].toLowerCase();
                    if (!key.startsWith("utm_") && !key.equals("fbclid") && !key.equals("gclid")) {
                        cleanParams.add(param);
                    }
                }
                if (!cleanParams.isEmpty()) {
                    query = String.join("&", cleanParams);
                } else {
                    query = null;
                }
            }

            // 6. Rebuild URL
            StringBuilder sb = new StringBuilder();
            sb.append(scheme).append("://").append(host);
            if (port != -1 && port != 80 && port != 443) {
                sb.append(":").append(port);
            }
            sb.append(path);
            if (query != null) {
                sb.append("?").append(query);
            }
            return sb.toString();
        } catch (Exception e) {
            // Fallback for malformed URLs
            return urlStr.trim();
        }
    }
}
