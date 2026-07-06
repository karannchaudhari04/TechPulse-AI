package com.techpulse.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.techpulse.model.User;
import com.techpulse.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
public class FirebaseJwtAuthenticationFilter extends OncePerRequestFilter {

    private final UserService userService;

    public FirebaseJwtAuthenticationFilter(@Lazy UserService userService) {
        this.userService = userService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
                String uid = decodedToken.getUid();
                
                List<GrantedAuthority> authorities = new ArrayList<>();
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
                
                // 1. Fetch user's role from centralized Redis cache to support multi-instance scale
                String userRole = userService.getUserRole(uid);
                if ("ADMIN".equals(userRole)) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                }
                
                // 2. Fetch full User object from local in-memory cache to share across the request
                Optional<User> userOpt = userService.getUserByFirebaseUid(uid);
                Object principal = userOpt.isPresent() ? userOpt.get() : uid;

                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(principal, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (Exception e) {
                logger.error("[Auth] Firebase token verification failed: " + e.getMessage());
            }
        }
        filterChain.doFilter(request, response);
    }
}
