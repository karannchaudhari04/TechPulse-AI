package com.techbite.controller;

import com.techbite.dto.ApiResponse;
import com.techbite.service.NewsIngestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin-only endpoint to manually trigger news ingestion.
 * Useful for testing or on-demand refresh.
 *
 * The scheduler runs automatically every 6 hours.
 */
@RestController
@RequestMapping("/api/v1/admin/news")
@PreAuthorize("hasRole('ADMIN')")
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
