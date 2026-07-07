package com.techpulse.agent;

import com.techpulse.agent.dto.SynthesizedTechnologyEventDTO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test validating SummaryCache composite key matches.
 */
public class SummaryCacheTest {

    @Test
    public void testCacheGetAndPut() {
        SummaryCache cache = new SummaryCache();
        String key = cache.generateKey("ev-123", "hash1", "hash2", "hash3", "V1", "model-x", 0.2, 1000, "sys-hash");

        SynthesizedTechnologyEventDTO dto = SynthesizedTechnologyEventDTO.builder()
                .summary("Cached summary text.")
                .build();

        cache.put(key, dto);
        assertEquals(dto, cache.get(key));

        cache.clear();
        assertNull(cache.get(key));
    }
}
