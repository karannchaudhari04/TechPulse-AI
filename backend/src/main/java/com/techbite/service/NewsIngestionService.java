package com.techbite.service;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import com.techbite.model.Bite;
import com.techbite.model.Category;
import com.techbite.repository.BiteRepository;
import com.techbite.repository.BookmarkRepository;
import com.techbite.repository.CategoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.techbite.repository.NewsSourceRepository;
import com.techbite.model.NewsSource;

import java.net.URL;
import java.net.URLConnection;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Fetches tech news from free RSS feeds, uses Gemini AI to summarize and
 * categorize each article, then saves them as Bites in the database.
 *
 * Runs automatically every 2 hours. Can also be triggered manually via
 * POST /api/v1/bites/admin/news/ingest
 */
@Service
public class NewsIngestionService {

    private static final Logger log = LoggerFactory.getLogger(NewsIngestionService.class);

    // Categories must match what's in the DB `categories` table
    private static final List<String> KNOWN_CATEGORIES = List.of(
        "DSA & Problem Solving", "Web Development", "Mobile Development",
        "AI & Machine Learning", "Cloud & DevOps", "System Design & Backend",
        "Cybersecurity", "Data Science & Analytics", "Product & UI/UX",
        "Open Source & GitHub", "Career & Placements", "Emerging Tech"
    );

    private final BiteRepository biteRepository;
    private final CategoryRepository categoryRepository;
    private final BookmarkRepository bookmarkRepository;
    private final NewsSourceRepository newsSourceRepository;
    private final ChatClient chatClient;
    private final org.springframework.cache.CacheManager cacheManager;

    private LocalDateTime lastRunTime;
    private int lastSavedCount = 0;

    public NewsIngestionService(BiteRepository biteRepository,
                                CategoryRepository categoryRepository,
                                BookmarkRepository bookmarkRepository,
                                NewsSourceRepository newsSourceRepository,
                                @org.springframework.context.annotation.Lazy ChatClient.Builder chatClientBuilder,
                                org.springframework.cache.CacheManager cacheManager) {
        this.biteRepository = biteRepository;
        this.categoryRepository = categoryRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.newsSourceRepository = newsSourceRepository;
        this.chatClient = chatClientBuilder.build();
        this.cacheManager = cacheManager;
    }

    @Value("${spring.ai.openai.api-key}")
    private String geminiApiKey;

    @Value("${app.news.ingestion.enabled:true}")
    private boolean ingestionEnabled;

    private final RestClient restClient = RestClient.builder().build();

    public Map<String, Object> getStatus() {
        return Map.of(
            "lastRun", lastRunTime != null ? lastRunTime.toString() : "Never",
            "lastSavedCount", lastSavedCount
        );
    }

    // Disable scheduled automatic bookmark pruning to allow bookmarks to persist indefinitely
    // @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void cleanupOldBookmarks() {
        log.info("[System] Scheduled bookmark cleanup is currently disabled.");
    }

    @Scheduled(cron = "0 0 */4 * * *")
    @SchedulerLock(
        name = "NewsIngestion_scheduledIngest", 
        lockAtMostFor = "15m", 
        lockAtLeastFor = "5m"
    )
    public void scheduledIngest() {
        if (!ingestionEnabled) {
            log.info("[NewsIngestion] Scheduled run skipped (disabled in config)");
            return;
        }
        log.info("[NewsIngestion] Scheduled run started at {}", LocalDateTime.now());
        ingestAllFeeds();
    }

    private final java.util.concurrent.atomic.AtomicBoolean isIngesting = new java.util.concurrent.atomic.AtomicBoolean(false);

    @Async
    public void ingestAllFeeds() {
        if (!isIngesting.compareAndSet(false, true)) {
            log.warn("[NewsIngestion] Ingestion already in progress. Skipping.");
            return;
        }
        try {
            log.info("[NewsIngestion] Starting async ingestion engine...");
            List<NewsSource> sources = newsSourceRepository.findByActiveTrue();
            int savedCount = 0;
            int skippedCount = 0;

            for (NewsSource source : sources) {
                try {
                    log.info("[NewsIngestion] Fetching feed: {} ({})", source.getName(), source.getUrl());
                    List<SyndEntry> entries = fetchRssFeed(source.getUrl());
                    
                    for (SyndEntry entry : entries) {
                        try {
                            boolean saved = processAndSaveEntry(entry);
                            if (saved) {
                                savedCount++;
                            } else {
                                skippedCount++;
                            }
                        } catch (QuotaExceededException qe) {
                            log.error("[NewsIngestion] 🛑 ABORTING: Daily Quota fully exhausted. See you tomorrow!");
                            this.lastSavedCount = savedCount;
                            this.lastRunTime = LocalDateTime.now();
                            return; // Stop the entire engine
                        } catch (Exception e) {
                            log.error("[NewsIngestion] Error processing entry: {}", e.getMessage());
                        }
                        // Increased sleep to 10s to stay safely under Free Tier 429 limits
                        Thread.sleep(10000); 
                    }
                } catch (Exception e) {
                    log.error("[NewsIngestion] Failed to process source {}: {}", source.getName(), e.getMessage());
                }
            }
            this.lastSavedCount = savedCount;
            this.lastRunTime = LocalDateTime.now();
            
            if (savedCount > 0) {
                log.info("[NewsIngestion] New bites ingested. Invalidating Redis feed caches...");
                org.springframework.cache.Cache globalFeed = cacheManager.getCache("globalFeed");
                if (globalFeed != null) globalFeed.clear();
                
                org.springframework.cache.Cache categoryFeed = cacheManager.getCache("categoryFeed");
                if (categoryFeed != null) categoryFeed.clear();
            }
            
            log.info("[NewsIngestion] Async Ingestion Completed. Saved: {}, Skipped: {}", savedCount, skippedCount);
        } finally {
            isIngesting.set(false);
        }
    }

    private List<SyndEntry> fetchRssFeed(String feedUrl) throws Exception {
        URL url = new URL(feedUrl);
        URLConnection connection = url.openConnection();
        connection.setConnectTimeout(10000); // 10s timeout
        connection.setReadTimeout(10000);
        connection.setRequestProperty("User-Agent", "TechBite-News-Bot/1.0");

        SyndFeedInput input = new SyndFeedInput();
        try (XmlReader reader = new XmlReader(connection)) {
            SyndFeed feed = input.build(reader);
            // Increase limit to 15 to catch more fresh items
            return feed.getEntries().stream().limit(15).toList();
        }
    }

    private boolean processAndSaveEntry(SyndEntry entry) {
        String sourceUrl = entry.getLink();
        if (sourceUrl == null || sourceUrl.isBlank()) return false;

        // Skip articles older than 72 hours to ensure a highly relevant fresh digest
        Date pubDate = entry.getPublishedDate();
        if (pubDate != null) {
            long ageInMillis = System.currentTimeMillis() - pubDate.getTime();
            long maxAge = 72L * 60 * 60 * 1000; // 72 hours
            if (ageInMillis > maxAge) {
                log.info("[NewsIngestion] Skipping old article ({}h old): {}", ageInMillis / 3600000, entry.getTitle());
                return false;
            }
        }


        if (biteRepository.existsByOriginalSourceUrl(sourceUrl)) return false;
        
        String rawTitle = entry.getTitle() != null ? entry.getTitle().trim() : "";
        if (rawTitle.isBlank()) return false;
        
        // Smarter Deduping: Skip if title already exists (even with different URL)
        if (biteRepository.existsByTitle(rawTitle)) {
            log.info("[NewsIngestion] Skipping duplicate title: {}", rawTitle);
            return false;
        }

        String rawDescription = extractText(entry);
        String thumbUrl = extractImage(entry);

        if (rawTitle.isBlank() || rawDescription.isBlank()) return false;

        String aiPrompt = buildPrompt(rawTitle, rawDescription);
        String aiResponse = null;
        try {
            // Direct call to Gemini API to avoid Spring AI Milestone/OpenAI shim issues
            Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                    Map.of("parts", List.of(Map.of("text", aiPrompt)))
                )
            );

        int retryCount = 0;
        List<String> modelsToTry = List.of(
            "gemini-3-flash-preview",
            "gemini-3.1-flash-lite-preview",
            "gemini-2.5-pro",
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite"
        );
        
        while (retryCount < modelsToTry.size()) {
            String currentModel = modelsToTry.get(retryCount);
            try {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + currentModel + ":generateContent?key=" + geminiApiKey;
                
                Map response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("User-Agent", "TechBite-News-Aggregator/2026-Edition")
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

                List candidates = (List) response.get("candidates");
                if (candidates == null || candidates.isEmpty()) throw new RuntimeException("Empty AI response");
                
                Map firstCandidate = (Map) candidates.get(0);
                Map content = (Map) firstCandidate.get("content");
                List parts = (List) content.get("parts");
                aiResponse = (String) ((Map) parts.get(0)).get("text");
                break; // Success!

            } catch (Exception e) {
                String errorMsg = e.getMessage();
                log.warn("[NewsIngestion] Model '{}' failed. Details: {}. Trying fallback... (Attempt {}/{})", 
                    currentModel, errorMsg, retryCount + 1, modelsToTry.size());
                
                // If we hit "Daily Quota Exceeded", stop everything to save resources
                if (errorMsg.contains("429") && (errorMsg.contains("RequestsPerDay") || errorMsg.contains("RequestsPerMinute"))) {
                    // Flash-Lite models usually have high RPM but low RPD on free tiers
                    if (errorMsg.contains("RequestsPerDay")) {
                        throw new QuotaExceededException(currentModel);
                    }
                }

                // Normal rate limit wait
                int waitTime = errorMsg.contains("429") ? 20000 : 5000;
                try { Thread.sleep(waitTime); } catch (InterruptedException ignored) {}
                retryCount++;
            }
            if (retryCount == modelsToTry.size()) return false;
        }
        } catch (Exception e) {
            log.error("[NewsIngestion] Direct Gemini API failed for '{}': {}", rawTitle, e.getMessage());
            return false;
        }

        ParsedBite parsed = parseAiResponse(aiResponse, rawTitle, sourceUrl);
        if (parsed == null) return false;

        Optional<Category> categoryOpt = categoryRepository.findByNameIgnoreCaseIn(
                Set.of(parsed.categoryName().toLowerCase())
        ).stream().findFirst();

        if (categoryOpt.isEmpty()) {
            log.warn("[NewsIngestion] No matching category for '{}'. Skipping.", parsed.categoryName());
            return false;
        }

        Bite bite = new Bite();
        bite.setTitle(parsed.title());
        bite.setContentSummary(parsed.summary());
        bite.setContentDescription(entry.getDescription() != null ? entry.getDescription().getValue() : "");
        bite.setThumbnailUrl(thumbUrl);
        bite.setOriginalSourceUrl(sourceUrl);
        bite.setAuthorAttribution(parseAuthor(entry));
        bite.setCategory(categoryOpt.get());
        bite.setStatus(Bite.Status.PUBLISHED);
        
        // Dynamic Fallback: Use category-specific high-quality imagery if no thumbnail is found
        if (bite.getThumbnailUrl() == null || bite.getThumbnailUrl().isBlank()) {
            bite.setThumbnailUrl(getCategoryFallbackImage(parsed.categoryName()));
        }

        bite.setPublishedAt(entry.getPublishedDate() != null
                ? entry.getPublishedDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime()
                : LocalDateTime.now());

        biteRepository.saveAndFlush(bite);
        log.info("[NewsIngestion] ✅ Saved: '{}'", bite.getTitle());
        return true;
    }

    private String extractImage(SyndEntry entry) {
        // 1. Try enclosures
        if (entry.getEnclosures() != null && !entry.getEnclosures().isEmpty()) {
            return entry.getEnclosures().get(0).getUrl();
        }
        
        // 2. Try foreign markup (media:content, media:thumbnail)
        if (entry.getForeignMarkup() != null) {
            String url = entry.getForeignMarkup().stream()
                .filter(el -> el.getName().equals("content") || el.getName().equals("thumbnail"))
                .map(el -> el.getAttributeValue("url"))
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
            if (url != null) return url;
        }

        // 3. Try parsing <img> tags from content or description
        String content = extractText(entry);
        if (content != null && content.contains("<img")) {
            Pattern imgPattern = Pattern.compile("<img[^>]+src=\"([^\"]+)\"");
            Matcher matcher = imgPattern.matcher(content);
            if (matcher.find()) {
                return matcher.group(1);
            }
        }
        
        return null;
    }

    private String getCategoryFallbackImage(String category) {
        return switch (category) {
            case "DSA & Problem Solving" -> "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&q=80&w=2000";
            case "Web Development" -> "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=2000";
            case "Mobile Development" -> "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&q=80&w=2000";
            case "AI & Machine Learning" -> "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=2000";
            case "Cloud & DevOps" -> "https://images.unsplash.com/photo-1618401471353-b98aedd07871?auto=format&fit=crop&q=80&w=2000";
            case "System Design & Backend" -> "https://images.unsplash.com/photo-1508921234172-b68ed335b3e6?auto=format&fit=crop&q=80&w=2000";
            case "Cybersecurity" -> "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2000";
            case "Data Science & Analytics" -> "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000";
            case "Product & UI/UX" -> "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&q=80&w=2000";
            case "Open Source & GitHub" -> "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=2000";
            case "Career & Placements" -> "https://images.unsplash.com/photo-1454165833767-0274b0596dba?auto=format&fit=crop&q=80&w=2000";
            case "Emerging Tech" -> "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000";
            default -> "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000";
        };
    }

    private String buildPrompt(String title, String description) {
    String categories = String.join(", ", KNOWN_CATEGORIES);
    
    return """
        You are a friendly and experienced tech mentor who explains latest technology news to computer science students and junior developers in a simple, clear, and engaging way.

        Article to Analyze:
        TITLE: %s
        CONTENT: %s

        Format your response EXACTLY as follows:
        TITLE: <A clear, interesting, and easy-to-understand title. Max 75 characters. Make it sound natural and professional.>
        CATEGORY: <Choose the most relevant from: %s>
        SUMMARY:
        • <Explain the main idea in simple and clear language>
        • <Why this matters for students or fresh software engineers>
        • <One practical tip or key takeaway>

        Strict Rules:
        - Use simple, everyday language. Avoid complex jargon or explain it if used.
        - The TITLE must be logical, meaningful, and easy to understand.
        - Total SUMMARY must be between 60 to 80 words.
        - Write in natural flowing paragraphs with bullet points.
        - Never cut off mid-sentence. Always complete your thoughts.
        - Keep a positive, encouraging, and helpful tone.
        - Stick ONLY to the facts in the article. Do not hallucinate or add extra information.
        - If the article is not relevant to software engineering or tech, respond ONLY with: SKIP
        """.formatted(title, description.substring(0, Math.min(description.length(), 2000)), categories);
}
    private ParsedBite parseAiResponse(String response, String fallbackTitle, String sourceUrl) {
        if (response == null || response.trim().equalsIgnoreCase("SKIP")) {
            return null;
        }

        String title = extractField(response, "TITLE");
        String category = extractField(response, "CATEGORY");
        String summary = extractField(response, "SUMMARY");

        if (title == null || category == null || summary == null) {
            return null;
        }

        title = title.length() > 150 ? title.substring(0, 147) + "..." : title;
        return new ParsedBite(title, category.trim(), summary.trim());
    }

    private String extractField(String text, String field) {
        Pattern pattern = Pattern.compile("^" + field + ":\\s*(.+?)(?=\\n[A-Z]+:|$)",
                Pattern.MULTILINE | Pattern.DOTALL);
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(1).trim() : null;
    }

    private String extractText(SyndEntry entry) {
        String html = "";
        if (entry.getDescription() != null) {
            html = entry.getDescription().getValue();
        } else if (!entry.getContents().isEmpty()) {
            html = entry.getContents().get(0).getValue();
        }
        
        if (html == null || html.isBlank()) return "";
        
        // Use Jsoup for robust HTML cleaning
        Document doc = Jsoup.parse(html);
        return doc.text().trim();
    }

    private String parseAuthor(SyndEntry entry) {
        if (entry.getAuthor() != null && !entry.getAuthor().isBlank()) {
            return entry.getAuthor();
        }
        return null;
    }

    private record ParsedBite(String title, String categoryName, String summary) {}

    private static class QuotaExceededException extends RuntimeException {
        public QuotaExceededException(String model) {
            super("Daily Quota Exceeded for " + model);
        }
    }
}
