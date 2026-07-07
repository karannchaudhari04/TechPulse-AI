package com.techpulse.config;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.redis.spring.RedisLockProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!test")
public class ShedLockConfig {

    @Bean
    public LockProvider lockProvider(RedisConnectionFactory connectionFactory) {
        // Distinguish locks in Redis under "techpulse" prefix
        return new RedisLockProvider(connectionFactory, "techpulse");
    }
}
