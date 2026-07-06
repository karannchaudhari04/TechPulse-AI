package com.techpulse.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final FirebaseJwtAuthenticationFilter firebaseJwtAuthenticationFilter;

    public SecurityConfig(FirebaseJwtAuthenticationFilter firebaseJwtAuthenticationFilter) {
        this.firebaseJwtAuthenticationFilter = firebaseJwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Health check, Swagger, and AssetLinks
                .requestMatchers("/actuator/health", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/", "/bite/**", "/.well-known/assetlinks.json").permitAll()
                // Public bite feed
                .requestMatchers("/api/v1/bites", "/api/v1/bites/foryou", "/api/v1/bites/{id}", "/api/v1/bites/explain").permitAll()
                // Permit register-or-login for initial handshake
                .requestMatchers("/api/v1/users/register-or-login").permitAll()
                // Strictly lock admin ingestion and bite management
                .requestMatchers("/api/v1/bites/admin/**", "/api/v1/admin/**").hasRole("ADMIN")
                // Strictly protect preferences and bookmarks
                .requestMatchers("/api/v1/users/**").authenticated()
                .requestMatchers("/api/v1/bookmarks/**").authenticated()
                .anyRequest().authenticated()
            )
            .addFilterBefore(firebaseJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(rateLimitFilter(), FirebaseJwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public RateLimitFilter rateLimitFilter() {
        return new RateLimitFilter();
    }

    @Bean
    public org.springframework.boot.web.servlet.FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration(RateLimitFilter filter) {
        org.springframework.boot.web.servlet.FilterRegistrationBean<RateLimitFilter> registration = 
            new org.springframework.boot.web.servlet.FilterRegistrationBean<>(filter);
        registration.setEnabled(false); // Prevents Spring Boot from registering it globally outside Spring Security
        return registration;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of(
            "https://techpulse.onrender.com",
            "http://localhost:*",
            "http://192.168.1.*"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Cache-Control"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L); // Cache preflight for 1 hour
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
