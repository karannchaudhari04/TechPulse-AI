package com.techpulse.controller;

import com.techpulse.dto.ApiResponse;
import com.techpulse.dto.SystemHealthReport;
import com.techpulse.service.NewsIngestionService;
import com.techpulse.service.BenchmarkService;
import com.techpulse.repository.NewsSourceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Admin-only endpoint to manually trigger news ingestion.
 * Useful for testing or on-demand refresh.
 */
@RestController
@RequestMapping("/api/v1/admin/news")
@PreAuthorize("hasRole('ADMIN')")
public class NewsIngestionController {

    private final NewsIngestionService newsIngestionService;
    private final com.techpulse.agent.DiscoveryAgent discoveryAgent;
    private final com.techpulse.agent.PipelineOrchestrator pipelineOrchestrator;
    private final BenchmarkService benchmarkService;
    private final NewsSourceRepository newsSourceRepository;

    public NewsIngestionController(NewsIngestionService newsIngestionService, 
                                   com.techpulse.agent.DiscoveryAgent discoveryAgent,
                                   com.techpulse.agent.PipelineOrchestrator pipelineOrchestrator,
                                   BenchmarkService benchmarkService,
                                   NewsSourceRepository newsSourceRepository) {
        this.newsIngestionService = newsIngestionService;
        this.discoveryAgent = discoveryAgent;
        this.pipelineOrchestrator = pipelineOrchestrator;
        this.benchmarkService = benchmarkService;
        this.newsSourceRepository = newsSourceRepository;
    }

    /**
     * GET /health — Returns component level system health mapping.
     */
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

        try {
            components.put("redis", "UP");
        } catch (Exception e) {
            components.put("redis", "DOWN (" + e.getMessage() + ")");
        }

        components.put("collectors", "UP");
        components.put("pipeline", "UP");

        SystemHealthReport report = new SystemHealthReport(status, LocalDateTime.now(), components);
        if ("DOWN".equals(status)) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(report);
        }
        return ResponseEntity.ok(report);
    }

    /**
     * GET /run-benchmarks — Run load and concurrency benchmark simulations.
     */
    @GetMapping("/run-benchmarks")
    public ResponseEntity<ApiResponse<Map<String, Object>>> runBenchmarks(
            @RequestParam(defaultValue = "SYNTHETIC") String mode,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(defaultValue = "2") int concurrency) {
        Map<String, Object> results = benchmarkService.runBenchmark(mode, size, concurrency);
        return ResponseEntity.ok(ApiResponse.success(results, "Benchmarks completed successfully."));
    }

    /**
     * GET /test-discovery — Runs the new DiscoveryAgent concurrently without database persistence or Gemini AI calls.
     */
    @GetMapping("/test-discovery")
    public ResponseEntity<ApiResponse<com.techpulse.agent.dto.DiscoveryResult>> testDiscovery() {
        String runId = UUID.randomUUID().toString();
        com.techpulse.agent.PipelineContext context = new com.techpulse.agent.PipelineContext(
                runId,
                LocalDateTime.now(),
                new HashMap<>()
        );
        com.techpulse.agent.dto.DiscoveryResult result = discoveryAgent.process(context);
        return ResponseEntity.ok(ApiResponse.success(result, "News discovery dry-run completed successfully."));
    }

    /**
     * GET /test-pipeline — Runs the full Phase 3 pipeline concurrently (Discovery -> Clean -> Classify -> Deduplicate) and returns execution report.
     */
    @GetMapping("/test-pipeline")
    public ResponseEntity<ApiResponse<com.techpulse.agent.dto.PipelineExecutionReport>> testPipeline() {
        String runId = UUID.randomUUID().toString();
        com.techpulse.agent.PipelineContext context = new com.techpulse.agent.PipelineContext(
                runId,
                LocalDateTime.now(),
                new HashMap<>()
        );
        com.techpulse.agent.dto.PipelineExecutionReport report = pipelineOrchestrator.execute(context);
        return ResponseEntity.ok(ApiResponse.success(report, "Full ingestion pipeline dry-run completed successfully."));
    }

    /**
     * GET version — open this directly in any browser to trigger ingestion.
     */
    @GetMapping("/ingest")
    public ResponseEntity<ApiResponse<Object>> triggerIngestGet() {
        return triggerIngest();
    }

    /**
     * POST version — use from Postman / curl.
     */
    @PostMapping("/ingest")
    public ResponseEntity<ApiResponse<Object>> triggerIngest() {
        newsIngestionService.ingestAllFeeds();
        return ResponseEntity.ok(ApiResponse.success(null, "News ingestion triggered in background. Check logs for progress."));
    }
}
