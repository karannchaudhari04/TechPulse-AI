package com.techpulse.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(properties = {
    "spring.cache.type=simple"
})
@ActiveProfiles("test")
public class CacheConfigurationTest {

    @Autowired
    private CacheManager cacheManager;

    @Test
    public void whenSimpleCacheEnabled_cacheManagerShouldNotBeNull() {
        assertNotNull(cacheManager);
    }
}
