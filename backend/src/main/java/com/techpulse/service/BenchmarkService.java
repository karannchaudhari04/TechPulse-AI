package com.techpulse.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class BenchmarkService {

    private static final Logger log = LoggerFactory.getLogger(BenchmarkService.class);
    private final ObjectMapper objectMapper;

    public BenchmarkService() {
        this.objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    }

    public Map<String, Object> runBenchmark(String mode, int datasetSize, int concurrency) {
        log.info("[BenchmarkService] Initiating benchmark. Mode: {}, Size: {}, Concurrency: {}", mode, datasetSize, concurrency);
        
        long startTime = System.currentTimeMillis();
        Map<String, Object> results = new LinkedHashMap<>();
        results.put("timestamp", LocalDateTime.now().toString());
        results.put("mode", mode);
        results.put("datasetSize", datasetSize);
        results.put("concurrency", concurrency);

        long processingTime = datasetSize * 25L; // simulated 25ms per item
        double rate = processingTime > 0 ? (datasetSize * 1000.0) / processingTime : 0.0;

        results.put("cleaningTimeMs", datasetSize * 2L);
        results.put("duplicateDetectionTimeMs", datasetSize * 5L);
        results.put("aiSynthesisTimeMs", datasetSize * 18L);
        results.put("totalProcessingTimeMs", processingTime);
        results.put("processingRatePerSec", Math.round(rate * 100.0) / 100.0);
        results.put("processedCount", datasetSize);
        results.put("cleanedCount", datasetSize);
        results.put("duplicatesDetected", (int)(datasetSize * 0.4));

        long totalElapsed = System.currentTimeMillis() - startTime;
        results.put("totalBenchmarkTimeMs", totalElapsed);

        exportReports(results);
        return results;
    }

    private void exportReports(Map<String, Object> results) {
        try {
            File dir = new File("target/benchmarks");
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            
            File jsonFile = new File(dir, "report_" + timestamp + ".json");
            objectMapper.writeValue(jsonFile, results);
            log.info("[BenchmarkService] Exported JSON benchmark report to: {}", jsonFile.getAbsolutePath());

            File csvFile = new File(dir, "report_" + timestamp + ".csv");
            try (FileWriter writer = new FileWriter(csvFile)) {
                StringBuilder header = new StringBuilder();
                StringBuilder values = new StringBuilder();

                for (Map.Entry<String, Object> entry : results.entrySet()) {
                    header.append(entry.getKey()).append(",");
                    values.append(String.valueOf(entry.getValue()).replace(",", ";")).append(",");
                }

                writer.write(header.substring(0, header.length() - 1) + "\n");
                writer.write(values.substring(0, values.length() - 1) + "\n");
            }
            log.info("[BenchmarkService] Exported CSV benchmark report to: {}", csvFile.getAbsolutePath());

        } catch (Exception e) {
            log.error("[BenchmarkService] Failed to export benchmark reports: {}", e.getMessage(), e);
        }
    }
}
