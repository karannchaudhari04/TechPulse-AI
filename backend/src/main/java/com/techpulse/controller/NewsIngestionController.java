package com.techpulse.controller;

import com.techpulse.dto.ApiResponse;
import com.techpulse.dto.SystemHealthReport;
import com.techpulse.service.NewsIngestionService;
import com.techpulse.service.BenchmarkService;
import com.techpulse.repository.*;
import com.techpulse.model.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/admin/news")
@PreAuthorize("hasRole('ADMIN')")
public class NewsIngestionController {

    private final NewsIngestionService newsIngestionService;
    private final BenchmarkService benchmarkService;
    private final NewsSourceRepository newsSourceRepository;
    private final com.techpulse.service.TrendService trendService;
    private final TechnologyEventRepository technologyEventRepository;

    public NewsIngestionController(NewsIngestionService newsIngestionService, 
                                   BenchmarkService benchmarkService,
                                   NewsSourceRepository newsSourceRepository,
                                   com.techpulse.service.TrendService trendService,
                                   TechnologyEventRepository technologyEventRepository) {
        this.newsIngestionService = newsIngestionService;
        this.benchmarkService = benchmarkService;
        this.newsSourceRepository = newsSourceRepository;
        this.trendService = trendService;
        this.technologyEventRepository = technologyEventRepository;
    }

    @GetMapping("/health")
    public ResponseEntity<SystemHealthReport> health() {
        Map<String, String> components = new HashMap<>();
        String status = "UP";

        try {
            long count = newsSourceRepository.count();
            components.put("database", "UP (sources count: " + count + ")");
        } catch (Exception e) {
            status = "DOWN";
            components.put("database", "DOWN (" + e.getMessage() + ")");
        }

        components.put("redis", "UP");
        components.put("collectors", "UP");
        components.put("pipeline", "UP");

        SystemHealthReport report = new SystemHealthReport(status, LocalDateTime.now(), components);
        if ("DOWN".equals(status)) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(report);
        }
        return ResponseEntity.ok(report);
    }

    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<List<com.techpulse.agent.dto.TrendReportDTO>>> trends() {
        List<com.techpulse.agent.dto.TrendReportDTO> report = trendService.calculateTrends();
        return ResponseEntity.ok(ApiResponse.success(report, "Technology trends reports computed successfully."));
    }

    @GetMapping("/run-benchmarks")
    public ResponseEntity<ApiResponse<Map<String, Object>>> runBenchmarks(
            @RequestParam(defaultValue = "SYNTHETIC") String mode,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(defaultValue = "2") int concurrency) {
        Map<String, Object> results = benchmarkService.runBenchmark(mode, size, concurrency);
        return ResponseEntity.ok(ApiResponse.success(results, "Benchmarks completed successfully."));
    }

    @GetMapping("/ingest")
    public ResponseEntity<ApiResponse<Object>> triggerIngestGet() {
        return triggerIngest();
    }

    @PostMapping("/ingest")
    public ResponseEntity<ApiResponse<Object>> triggerIngest() {
        newsIngestionService.ingestAllFeeds();
        return ResponseEntity.ok(ApiResponse.success(null, "News Ingestion process triggered in the background."));
    }
}
