package com.techpulse.agent;

import com.techpulse.agent.dto.SynthesizedTechnologyEventDTO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test validating SummaryCache invalidation on attribute hash changes.
 */
public class CacheInvalidationTest {

    @Test
    public void testCacheKeyDifferentiation() {
        SummaryCache cache = new SummaryCache();

        String key1 = cache.generateKey("ev-123", "hash1", "hash2", "hash3", "V1", "model-x", 0.2, 1000, "sys-hash");
        String key2 = cache.generateKey("ev-123", "differentHash", "hash2", "hash3", "V1", "model-x", 0.2, 1000, "sys-hash");

        SynthesizedTechnologyEventDTO dto = SynthesizedTechnologyEventDTO.builder()
                .summary("Cached summary text.")
                .build();

        cache.put(key1, dto);
        assertNotNull(cache.get(key1));
        assertNull(cache.get(key2));
    }
}
