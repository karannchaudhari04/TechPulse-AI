package com.techpulse.security;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.distributed.BucketProxy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.distributed.proxy.RemoteBucketBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class RateLimitFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProxyManager<String> proxyManager;

    private BucketProxy mockBucket;

    @BeforeEach
    @SuppressWarnings("unchecked")
    public void setup() {
        mockBucket = Mockito.mock(BucketProxy.class);
        RemoteBucketBuilder<String> builder = Mockito.mock(RemoteBucketBuilder.class);
        
        Mockito.when(proxyManager.builder()).thenReturn(builder);
        Mockito.when(builder.build(anyString(), any(java.util.function.Supplier.class))).thenReturn(mockBucket);
    }

    @Test
    public void whenRateLimitNotExceeded_shouldAllowRequest() throws Exception {
        Mockito.when(mockBucket.tryConsume(1)).thenReturn(true);
        mockMvc.perform(get("/api/v1/bites"))
                .andExpect(status().isOk());
    }

    @Test
    public void whenRateLimitExceeded_shouldBlockRequest() throws Exception {
        Mockito.when(mockBucket.tryConsume(1)).thenReturn(false);
        mockMvc.perform(get("/api/v1/bites"))
                .andExpect(status().is4xxClientError());
    }
}
