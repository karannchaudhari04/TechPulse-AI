package com.techpulse.config;

import io.github.bucket4j.distributed.proxy.ProxyManager;
import org.mockito.Mockito;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("test")
public class TestRateLimitConfig {

    @Bean
    @SuppressWarnings("unchecked")
    public ProxyManager<String> proxyManager() {
        return Mockito.mock(ProxyManager.class);
    }
}
