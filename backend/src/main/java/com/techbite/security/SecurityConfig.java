package com.techbite.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.http.HttpMethod;

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
                // Health check — needed by Docker and Oracle load balancer
                .requestMatchers("/actuator/health").permitAll()
                // Public bite feed endpoints
                .requestMatchers("/api/v1/bites", "/api/v1/bites/foryou", "/api/v1/bites/explain").permitAll()
                .requestMatchers("/api/v1/bites/admin/**").hasRole("ADMIN")
                // News ingestion — permit for manual testing via browser or Postman
                .requestMatchers("/api/v1/admin/news/ingest").permitAll()
                // register-or-login: token may still be fresh, allow it through
                .requestMatchers(HttpMethod.POST, "/api/v1/users/register-or-login").permitAll()
                // Preferences and bookmarks require a valid Firebase token
                .requestMatchers("/api/v1/users/**").authenticated()
                .requestMatchers("/api/v1/bookmarks/**").authenticated()
                .anyRequest().authenticated()
            )
            .addFilterBefore(firebaseJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*")); // Allow all origins
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
