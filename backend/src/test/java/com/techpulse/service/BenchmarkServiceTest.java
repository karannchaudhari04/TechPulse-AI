package com.techpulse.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class BenchmarkServiceTest {

    private BenchmarkService benchmarkService;

    @BeforeEach
    public void setUp() {
        benchmarkService = new BenchmarkService();
    }

    @Test
    public void testSyntheticBenchmark() {
        Map<String, Object> results = benchmarkService.runBenchmark("SYNTHETIC", 10, 1);

        assertNotNull(results);
        assertEquals("SYNTHETIC", results.get("mode"));
        assertEquals(10, results.get("datasetSize"));
        assertTrue(results.containsKey("processingRatePerSec"));
        assertTrue(results.containsKey("totalProcessingTimeMs"));
    }
}
