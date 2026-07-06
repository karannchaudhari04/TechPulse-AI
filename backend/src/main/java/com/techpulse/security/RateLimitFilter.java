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
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    @Autowired
    private ProxyManager<String> proxyManager;

    private BucketConfiguration createNewBucketConfig(boolean isAuthenticated) {
        long capacity = isAuthenticated ? 200 : 60;
        Refill refill = Refill.greedy(capacity, Duration.ofMinutes(1));
        Bandwidth limit = Bandwidth.classic(capacity, refill);
        return BucketConfiguration.builder().addLimit(limit).build();
    }

    private Bucket resolveBucket(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAuthenticated = auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser");
        
        String key;
        if (isAuthenticated) {
            key = "AUTH_" + auth.getPrincipal().toString();
        } else {
            // Fallback to IP address for guests
            String xfHeader = request.getHeader("X-Forwarded-For");
            key = "GUEST_" + (xfHeader == null ? request.getRemoteAddr() : xfHeader.split(",")[0]);
        }
        
        log.debug("[RateLimitFilter] Resolved key: {}, isAuthenticated: {}", key, isAuthenticated);
        return proxyManager.builder().build(key, () -> createNewBucketConfig(isAuthenticated));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();
        if (uri.startsWith("/api/v1/bites")) {
            Bucket bucket = resolveBucket(request);
            log.info("[RateLimitFilter] Request to URI: {}, Resolved Remote Address: {}", uri, request.getRemoteAddr());
            if (!bucket.tryConsume(1)) {
                log.warn("[RateLimitFilter] 🛑 RATE LIMIT EXCEEDED for key. Blocking request to {}", uri);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.getWriter().write("Too many requests. Please try again later.");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
