package com.techpulse.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.Refill;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.techpulse.model.User;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    @Autowired
    private ProxyManager<String> proxyManager;

    @Value("${app.rate-limit.ai.per-user-per-minute:12}")
    private long aiRequestsPerUserPerMinute;

    @Value("${app.rate-limit.ai.per-ip-per-minute:30}")
    private long aiRequestsPerIpPerMinute;

    private BucketConfiguration createNewBucketConfig(long capacity) {
        Refill refill = Refill.greedy(capacity, Duration.ofMinutes(1));
        Bandwidth limit = Bandwidth.classic(capacity, refill);
        return BucketConfiguration.builder().addLimit(limit).build();
    }

    private Bucket resolveBucket(String key, long capacity) {
        if (proxyManager == null) {
            throw new IllegalStateException("Rate limit store is unavailable");
        }
        var builder = proxyManager.builder();
        if (builder == null) {
            throw new IllegalStateException("Rate limit store is unavailable");
        }
        return builder.build(key, () -> createNewBucketConfig(capacity));
    }

    private boolean isPaidAiEndpoint(String uri) {
        return uri.equals("/api/v1/assistant/chat") || uri.equals("/api/v1/assistant/regenerate")
                || uri.equals("/api/v1/intelligence/brief")
                || uri.equals("/api/v1/bites/explain");
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return forwarded == null || forwarded.isBlank()
                ? request.getRemoteAddr()
                : forwarded.split(",")[0].trim();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        if (uri.startsWith("/api/v1/")) {
            boolean paidAi = isPaidAiEndpoint(uri);
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                boolean isAuthenticated = auth != null && auth.isAuthenticated()
                        && !"anonymousUser".equals(auth.getPrincipal());
                List<Bucket> buckets = new ArrayList<>();
                if (paidAi) {
                    if (!isAuthenticated) {
                        response.sendError(HttpStatus.UNAUTHORIZED.value());
                        return;
                    }
                    Object principal = auth.getPrincipal();
                    String firebaseUid = principal instanceof User user ? user.getFirebaseUid() : auth.getName();
                    String userKey = "AI_USER_" + firebaseUid;
                    String ipKey = "AI_IP_" + clientIp(request);
                    buckets.add(resolveBucket(userKey, aiRequestsPerUserPerMinute));
                    buckets.add(resolveBucket(ipKey, aiRequestsPerIpPerMinute));
                } else {
                    String key = isAuthenticated ? "AUTH_" + auth.getName() : "GUEST_" + clientIp(request);
                    buckets.add(resolveBucket(key, isAuthenticated ? 200 : 60));
                }

                boolean allowed = true;
                for (Bucket bucket : buckets) {
                    if (!bucket.tryConsume(1)) {
                        allowed = false;
                    }
                }
                if (!allowed) {
                    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                    response.getWriter().write("Too many requests. Please try again later.");
                    return;
                }
            } catch (Exception e) {
                log.warn("[RateLimitFilter] Rate limit check failed for {}: {}", uri, e.getMessage());
                if (paidAi) {
                    response.sendError(HttpStatus.SERVICE_UNAVAILABLE.value(), "AI request throttling is unavailable.");
                    return;
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
