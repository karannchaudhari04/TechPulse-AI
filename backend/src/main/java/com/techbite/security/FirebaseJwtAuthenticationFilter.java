package com.techbite.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

import com.techbite.repository.UserRepository;
import com.techbite.model.User;

@Component
public class FirebaseJwtAuthenticationFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    public FirebaseJwtAuthenticationFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
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
                String email = decodedToken.getEmail();
                logger.info("[Auth] Token verified for UID: " + uid);
                
                // --- Production Resiliency: Auto-Upsert User ---
                if (userRepository.findByFirebaseUid(uid).isEmpty()) {
                    User newUser = new User();
                    newUser.setFirebaseUid(uid);
                    newUser.setEmail(email != null ? email : uid + "@unknown.com");
                    userRepository.save(newUser);
                    logger.info("[Auth] Auto-registered new user: " + email);
                }
                
                List<SimpleGrantedAuthority> authorities;
                List<String> adminEmails = List.of("karanchaudhari722@gmail.com", "karanchaudhari34804@gmail.com");
                
                if (email != null && adminEmails.contains(email)) {
                    authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"), new SimpleGrantedAuthority("ROLE_ADMIN"));
                    logger.info("[Auth] Admin privileges granted to: " + email);
                } else {
                    authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
                }
                
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(uid, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                logger.info("[Auth] SecurityContext set for UID: " + uid);

            } catch (Exception e) {
                logger.error("[Auth] Firebase token verification failed: " + e.getMessage());
            }
        } else {
            logger.debug("[Auth] No Bearer token found in request to: " + request.getRequestURI());
        }
        filterChain.doFilter(request, response);
    }
}
