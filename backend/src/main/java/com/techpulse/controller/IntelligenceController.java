package com.techpulse.controller;

import com.techpulse.dto.ApiResponse;
import com.techpulse.agent.AIClient;
import com.techpulse.agent.dto.AIRequest;
import com.techpulse.agent.dto.AIResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/intelligence")
public class IntelligenceController {

    private final AIClient aiClient;

    public IntelligenceController(AIClient aiClient) {
        this.aiClient = aiClient;
    }

    @GetMapping("/graph")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getGraph() {
        Map<String, Object> data = new HashMap<>();
        
        List<Map<String, Object>> nodes = new ArrayList<>();
        nodes.add(createNode("java", "Java Language", "language"));
        nodes.add(createNode("spring-boot", "Spring Boot", "technology"));
        nodes.add(createNode("react", "React Native", "technology"));
        nodes.add(createNode("docker", "Docker Containers", "cloud"));
        nodes.add(createNode("google", "Google Cloud", "company"));
        nodes.add(createNode("cve-1234", "CVE-2026-1234", "cve"));
        data.put("nodes", nodes);

        List<Map<String, Object>> links = new ArrayList<>();
        links.add(createLink("spring-boot", "java", "built_on"));
        links.add(createLink("spring-boot", "docker", "deployed_via"));
        links.add(createLink("java", "cve-1234", "vulnerable_to"));
        data.put("links", links);

        return ResponseEntity.ok(ApiResponse.success(data, "Knowledge graph fetched successfully"));
    }

    @GetMapping("/technology/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTechnology(@PathVariable String id) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", id);
        data.put("name", id.substring(0, 1).toUpperCase() + id.substring(1));
        data.put("latestVersion", "21.0.1");
        data.put("trendingScore", 85);
        data.put("overview", id.substring(0, 1).toUpperCase() + id.substring(1) + " is widely adopted in modern enterprise software stacks for modular architecture and scalability.");
        
        List<String> breaking = new ArrayList<>();
        breaking.add("Deprecated legacy reflection mechanisms.");
        breaking.add("Removed support for outdated JVM configurations.");
        data.put("breakingChanges", breaking);

        return ResponseEntity.ok(ApiResponse.success(data, "Technology details fetched successfully"));
    }

    @GetMapping("/company/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCompany(@PathVariable String id) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", id);
        data.put("name", id.substring(0, 1).toUpperCase() + id.substring(1));
        data.put("aiSummary", id.substring(0, 1).toUpperCase() + id.substring(1) + " is actively contributing to open-source developer toolkits, focusing on containerization, serverless compute, and machine learning SDKs.");
        
        List<String> announcements = new ArrayList<>();
        announcements.add("Announced integration support for next-gen virtualization instances.");
        announcements.add("Released developer preview of advanced security auditing dashboards.");
        data.put("announcements", announcements);

        return ResponseEntity.ok(ApiResponse.success(data, "Company details fetched successfully"));
    }

    @GetMapping("/release/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRelease(@PathVariable String id) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", id);
        data.put("version", "v3.2.0");
        data.put("notes", "Major stability updates. Faster cold-start initialization and lower heap memory usage under concurrent loads.");
        data.put("compatibility", "Compatible with Java 17 and Java 21 runtimes.");
        data.put("migrationGuide", "Upgrade your project build plugins, and resolve deprecated direct properties imports as detailed in the official changelog.");

        return ResponseEntity.ok(ApiResponse.success(data, "Release details fetched successfully"));
    }

    @GetMapping("/timeline/{id}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTimeline(@PathVariable String id) {
        List<Map<String, Object>> timeline = new ArrayList<>();
        
        Map<String, Object> t1 = new HashMap<>();
        t1.put("id", "t-1");
        t1.put("version", "21.0.0");
        t1.put("date", "2026-05-10");
        t1.put("headline", "LTS Release Launch");
        t1.put("description", "Introduced stable virtual threads supporting scalable concurrent threads processing.");
        timeline.add(t1);

        Map<String, Object> t2 = new HashMap<>();
        t2.put("id", "t-2");
        t2.put("version", "21.0.1");
        t2.put("date", "2026-07-01");
        t2.put("headline", "Minor security patch update");
        t2.put("description", "Addressed CVE-2026-1234 within reflection loaders.");
        timeline.add(t2);

        return ResponseEntity.ok(ApiResponse.success(timeline, "Timeline fetched successfully"));
    }

    @PostMapping("/compare")
    public ResponseEntity<ApiResponse<Map<String, Object>>> compare(@RequestBody Map<String, Object> request) {
        List<String> techs = (List<String>) request.get("techs");
        
        Map<String, Object> data = new HashMap<>();
        data.put("techNames", techs != null ? techs : Arrays.asList("react", "angular"));
        
        List<String> features = Arrays.asList("Performance", "Learning Curve", "Ecosystem Sizing");
        data.put("features", features);

        Map<String, Object> ratings = new HashMap<>();
        ratings.put("react", Arrays.asList("Excellent", "Easy", "Massive"));
        ratings.put("angular", Arrays.asList("Good", "Complex", "Large"));
        data.put("ratings", ratings);

        data.put("summary", "React excels in client-side responsiveness and library ecosystems, whereas Angular offers a highly structured full-framework approach.");

        return ResponseEntity.ok(ApiResponse.success(data, "Comparison details processed successfully"));
    }

    @PostMapping("/brief")
    public ResponseEntity<ApiResponse<Map<String, Object>>> brief(@RequestBody Map<String, Object> request) {
        String topic = (String) request.get("topic");
        String format = (String) request.get("format");

        AIRequest aiRequest = AIRequest.builder()
                .systemPrompt("You are an engineering analyst. Return a JSON object with a single field 'content' containing a technical summary and guide for the topic.")
                .userPrompt("Generate an engineering brief for: " + topic + " in " + format + " format.")
                .temperature(0.5)
                .build();

        AIResponse response = aiClient.generate(aiRequest);

        String rawContent = response.getContent();
        String message = rawContent;
        try {
            if (rawContent.trim().startsWith("{")) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode node = mapper.readTree(rawContent);
                if (node.has("content")) {
                    message = node.get("content").asText();
                } else if (node.has("response")) {
                    message = node.get("response").asText();
                } else if (node.has("text")) {
                    message = node.get("text").asText();
                }
            }
        } catch (Exception e) {
            // fallback
        }

        Map<String, Object> data = new HashMap<>();
        data.put("topic", topic);
        data.put("format", format);
        data.put("content", message);

        return ResponseEntity.ok(ApiResponse.success(data, "Tech brief generated successfully"));
    }


    private Map<String, Object> createNode(String id, String label, String type) {
        Map<String, Object> node = new HashMap<>();
        node.put("id", id);
        node.put("label", label);
        node.put("type", type);
        return node;
    }

    private Map<String, Object> createLink(String source, String target, String relationship) {
        Map<String, Object> link = new HashMap<>();
        link.put("source", source);
        link.put("target", target);
        link.put("relationship", relationship);
        return link;
    }
}
