package com.techpulse.agent;

import io.github.bucket4j.distributed.proxy.ProxyManager;
import net.javacrumbs.shedlock.core.LockProvider;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Spring Boot Integration Test validating that the application context compiles
 * and loads with all AI synthesis components autowired.
 */
@SpringBootTest(properties = {
    "spring.sql.init.mode=never",
    "spring.data.redis.repositories.enabled=false",
    "spring.cache.type=none",
    "GEMINI_API_KEY=mock-key-for-synthesis-testing",
    "JWT_SECRET=mock-jwt-secret-key-of-at-least-256-bits-length-to-be-secure-for-testing"
})
@ActiveProfiles("test")
public class PipelineIntegrationTest {

    @MockBean
    private RedisConnectionFactory redisConnectionFactory;

    @MockBean
    private ProxyManager<String> proxyManager;

    @MockBean
    private LockProvider lockProvider;

    @MockBean
    private RedisTemplate<String, Object> redisTemplate;

    @Test
    public void contextLoads() {
        assertTrue(true);
    }
}
