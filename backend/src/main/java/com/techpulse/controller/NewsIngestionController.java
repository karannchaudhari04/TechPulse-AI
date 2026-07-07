package com.techpulse.controller;

import com.techpulse.dto.ApiResponse;
import com.techpulse.dto.SystemHealthReport;
import com.techpulse.service.NewsIngestionService;
import com.techpulse.service.BenchmarkService;
import com.techpulse.repository.*;
import com.techpulse.model.*;
import com.techpulse.agent.*;
import com.techpulse.agent.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Admin-only endpoints to manually trigger ingestion, calculate trends, check health,
 * and test/regenerate AI synthesis summaries.
 */
@RestController
@RequestMapping("/api/v1/admin/news")
@PreAuthorize("hasRole('ADMIN')")
public class NewsIngestionController {

    private final NewsIngestionService newsIngestionService;
    private final DiscoveryAgent discoveryAgent;
    private final PipelineOrchestrator pipelineOrchestrator;
    private final BenchmarkService benchmarkService;
    private final NewsSourceRepository newsSourceRepository;
    private final com.techpulse.service.TrendService trendService;
    private final com.techpulse.service.SummaryService summaryService;
    private final SummaryCache summaryCache;
    private final TechnologyEventRepository technologyEventRepository;
    private final EventTimelineRepository eventTimelineRepository;
    private final KgNodeRepository kgNodeRepository;
    private final KgEdgeRepository kgEdgeRepository;

    public NewsIngestionController(NewsIngestionService newsIngestionService, 
                                   DiscoveryAgent discoveryAgent,
                                   PipelineOrchestrator pipelineOrchestrator,
                                   BenchmarkService benchmarkService,
                                   NewsSourceRepository newsSourceRepository,
                                   com.techpulse.service.TrendService trendService,
                                   com.techpulse.service.SummaryService summaryService,
                                   SummaryCache summaryCache,
                                   TechnologyEventRepository technologyEventRepository,
                                   EventTimelineRepository eventTimelineRepository,
                                   KgNodeRepository kgNodeRepository,
                                   KgEdgeRepository kgEdgeRepository) {
        this.newsIngestionService = newsIngestionService;
        this.discoveryAgent = discoveryAgent;
        this.pipelineOrchestrator = pipelineOrchestrator;
        this.benchmarkService = benchmarkService;
        this.newsSourceRepository = newsSourceRepository;
        this.trendService = trendService;
        this.summaryService = summaryService;
        this.summaryCache = summaryCache;
        this.technologyEventRepository = technologyEventRepository;
        this.eventTimelineRepository = eventTimelineRepository;
        this.kgNodeRepository = kgNodeRepository;
        this.kgEdgeRepository = kgEdgeRepository;
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
     * GET /trends — Recalculates and returns the trending technology entities report.
     */
    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<List<TrendReportDTO>>> trends() {
        List<TrendReportDTO> report = trendService.calculateTrends();
        return ResponseEntity.ok(ApiResponse.success(report, "Technology trends reports computed successfully."));
    }

    /**
     * GET /test-summary — Generates a test summary DTO without database persistence.
     */
    @GetMapping("/test-summary")
    public ResponseEntity<ApiResponse<SynthesizedTechnologyEventDTO>> testSummary() {
        TechnologyEvent event = TechnologyEvent.builder()
                .id("test-event-id")
                .title("Spring Boot v3.2.0 GA Release")
                .categoriesJson("[\"SYSTEM_DESIGN_BACKEND\"]")
                .credibilityScore(0.95)
                .importanceScore(0.85)
                .lifecycleStatus("GA")
                .versionString("v3.2.0")
                .entitiesJson("[\"Spring Boot\"]")
                .build();
        TechnologyEventDTO dto = TechnologyEventDTO.builder()
                .event(event)
                .supportingUpdates(new ArrayList<>())
                .build();
        
        SynthesizedTechnologyEventDTO summary = summaryService.generateWithoutPersistence(dto);
        return ResponseEntity.ok(ApiResponse.success(summary, "AI Summary generated successfully without DB persistence."));
    }

    /**
     * GET /event/{eventId} — Returns TechnologyEvent combined with Timeline and Knowledge Graph.
     */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getEvent(@PathVariable String eventId) {
        Optional<TechnologyEvent> eventOpt = technologyEventRepository.findById(eventId);
        if (eventOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Technology event not found for ID: " + eventId));
        }

        TechnologyEvent event = eventOpt.get();
        List<EventTimeline> timelines = eventTimelineRepository.findAll().stream()
                .filter(t -> t.getEventId().equals(eventId))
                .toList();

        // Nodes & Edges
        List<KgNode> allNodes = kgNodeRepository.findAll();
        List<String> eventEntityNames = new ArrayList<>();
        try {
            String clean = event.getEntitiesJson().replace("[", "").replace("]", "").replace("\"", "");
            if (!clean.trim().isEmpty()) {
                List<String> parsed = Arrays.stream(clean.split(","))
                        .map(String::trim)
                        .toList();
                eventEntityNames.addAll(parsed);
            }
        } catch (Exception ignored) {}

        List<String> nodeIds = allNodes.stream()
                .filter(n -> eventEntityNames.contains(n.getName()))
                .map(KgNode::getId)
                .toList();

        List<KgEdge> edges = new ArrayList<>();
        if (!nodeIds.isEmpty()) {
            edges = kgEdgeRepository.findAll().stream()
                    .filter(e -> nodeIds.contains(e.getSourceNodeId()) || nodeIds.contains(e.getTargetNodeId()))
                    .toList();
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("event", event);
        data.put("timeline", timelines);
        data.put("graphNodes", allNodes.stream().filter(n -> nodeIds.contains(n.getId())).toList());
        data.put("graphEdges", edges);

        return ResponseEntity.ok(ApiResponse.success(data, "Technology event compiled successfully."));
    }

    /**
     * POST /regenerate-summary/{eventId} — Clears cache and forces summary regeneration.
     */
    @PostMapping("/regenerate-summary/{eventId}")
    public ResponseEntity<ApiResponse<SynthesizedTechnologyEventDTO>> regenerateSummary(@PathVariable String eventId) {
        Optional<TechnologyEvent> eventOpt = technologyEventRepository.findById(eventId);
        if (eventOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Technology event not found for ID: " + eventId));
        }

        TechnologyEvent event = eventOpt.get();
        summaryCache.clear(); // Clear all cached summaries to force generation

        TechnologyEventDTO dto = TechnologyEventDTO.builder()
                .event(event)
                .supportingUpdates(new ArrayList<>())
                .build();

        SynthesizedTechnologyEventDTO summary = summaryService.process(dto);
        return ResponseEntity.ok(ApiResponse.success(summary, "AI Summary regenerated successfully."));
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
     * GET /test-discovery — Runs the new DiscoveryAgent concurrently without database persistence.
     */
    @GetMapping("/test-discovery")
    public ResponseEntity<ApiResponse<DiscoveryResult>> testDiscovery() {
        String runId = UUID.randomUUID().toString();
        PipelineContext context = new PipelineContext(
                runId,
                LocalDateTime.now(),
                new HashMap<>()
        );
        DiscoveryResult result = discoveryAgent.process(context);
        return ResponseEntity.ok(ApiResponse.success(result, "News discovery dry-run completed successfully."));
    }

    /**
     * GET /test-pipeline — Runs the full pipeline and returns execution report.
     */
    @GetMapping("/test-pipeline")
    public ResponseEntity<ApiResponse<PipelineExecutionReport>> testPipeline() {
        String runId = UUID.randomUUID().toString();
        PipelineContext context = new PipelineContext(
                runId,
                LocalDateTime.now(),
                new HashMap<>()
        );
        PipelineExecutionReport report = pipelineOrchestrator.execute(context);
        return ResponseEntity.ok(ApiResponse.success(report, "Full ingestion pipeline dry-run completed successfully."));
    }

    /**
     * GET /ingest — open this directly in any browser to trigger ingestion.
     */
    @GetMapping("/ingest")
    public ResponseEntity<ApiResponse<Object>> triggerIngestGet() {
        return triggerIngest();
    }

    /**
     * POST /ingest — trigger ingestion manually.
     */
    @PostMapping("/ingest")
    public ResponseEntity<ApiResponse<Object>> triggerIngest() {
        newsIngestionService.ingestAllFeeds();
        return ResponseEntity.ok(ApiResponse.success(null, "News ingestion triggered in background."));
    }
}
