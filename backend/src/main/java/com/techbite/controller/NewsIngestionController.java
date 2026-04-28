package com.techbite.controller;

import com.techbite.dto.ApiResponse;
import com.techbite.service.NewsIngestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin-only endpoint to manually trigger news ingestion.
 * Useful for testing or on-demand refresh.
 *
 * The scheduler runs automatically every 6 hours.
 *
 * Usage:
 *   POST /api/v1/admin/news/ingest
 *   (No request body needed)
 */
@RestController
@RequestMapping("/api/v1/admin/news")
public class NewsIngestionController {

    private final NewsIngestionService newsIngestionService;

    public NewsIngestionController(NewsIngestionService newsIngestionService) {
        this.newsIngestionService = newsIngestionService;
    }

    /**
     * GET version — open this directly in any browser to trigger ingestion.
     * http://192.168.1.37:8080/api/v1/admin/news/ingest
     */
    @GetMapping("/ingest")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerIngestGet() {
        return triggerIngest();
    }

    /**
     * POST version — use from Postman / curl.
     */
    @PostMapping("/ingest")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerIngest() {
        Map<String, Object> result = newsIngestionService.ingestAllFeeds();
        return ResponseEntity.ok(ApiResponse.success(result, "News ingestion completed"));
    }
}
