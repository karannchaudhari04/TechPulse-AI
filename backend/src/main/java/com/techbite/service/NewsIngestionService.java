package com.techbite.service;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
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
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    // ── High-Value Tech Feeds for CS Students ──────────────────────────────
    private static final List<String> RSS_FEEDS = List.of(
        "https://techcrunch.com/feed/",
        "https://www.theverge.com/rss/index.xml",
        "https://feeds.arstechnica.com/arstechnica/index",
        "https://hnrss.org/frontpage", // Fast-moving frontpage news
        "https://hnrss.org/newest",    // Absolute newest from HN
        "https://dev.to/feed",
        "https://www.wired.com/feed/rss",
        "https://www.freecodecamp.org/news/rss/",
        "https://www.thehindu.com/sci-tech/technology/feeder/default.rss" // Localized tech news
    );

    // ── Category names must match what's in the DB `categories` table ───────
    private static final List<String> KNOWN_CATEGORIES = List.of(
        "Artificial Intelligence", "Web Development", "Data Structures",
        "Cybersecurity", "Hardware & Chips", "System Design",
        "Open Source", "Career Tips"
    );

    private final BiteRepository biteRepository;
    private final CategoryRepository categoryRepository;
    private final BookmarkRepository bookmarkRepository;
    private final ChatClient chatClient;

    private LocalDateTime lastRunTime;
    private int lastSavedCount = 0;

    public NewsIngestionService(BiteRepository biteRepository,
                                CategoryRepository categoryRepository,
                                BookmarkRepository bookmarkRepository,
                                ChatClient.Builder chatClientBuilder) {
        this.biteRepository = biteRepository;
        this.categoryRepository = categoryRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.chatClient = chatClientBuilder.build();
    }

    @Value("${spring.ai.openai.api-key}")
    private String geminiApiKey;

    private final RestClient restClient = RestClient.builder().build();

    public Map<String, Object> getStatus() {
        return Map.of(
            "lastRun", lastRunTime != null ? lastRunTime.toString() : "Never",
            "lastSavedCount", lastSavedCount
        );
    }

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void cleanupOldBookmarks() {
        log.info("[System] Starting bookmark cleanup...");
        LocalDateTime expiryDate = LocalDateTime.now().minusDays(7);
        bookmarkRepository.deleteByCreatedAtBefore(expiryDate);
        log.info("[System] Cleaned up bookmarks older than {}", expiryDate);
    }

    @Scheduled(cron = "0 0 */2 * * *")
    public void scheduledIngest() {
        log.info("[NewsIngestion] Scheduled run started at {}", LocalDateTime.now());
        ingestAllFeeds();
    }

    private final java.util.concurrent.atomic.AtomicBoolean isIngesting = new java.util.concurrent.atomic.AtomicBoolean(false);

    public Map<String, Object> ingestAllFeeds() {
        if (!isIngesting.compareAndSet(false, true)) {
            log.warn("[NewsIngestion] Ingestion already in progress. Ignoring trigger.");
            return Map.of("status", "Error", "message", "Ingestion already in progress");
        }
        try {
            log.info("[NewsIngestion] Starting ingestion engine...");
        int savedCount = 0;
        int skippedCount = 0;
        List<String> errors = new ArrayList<>();

        for (String feedUrl : RSS_FEEDS) {
            try {
                log.info("[NewsIngestion] Fetching feed: {}", feedUrl);
                List<SyndEntry> entries = fetchRssFeed(feedUrl);
                log.info("[NewsIngestion] Found {} entries in {}", entries.size(), feedUrl);

                for (SyndEntry entry : entries) {
                    try {
                        boolean saved = processAndSaveEntry(entry);
                        if (saved) {
                            savedCount++;
                            log.info("[NewsIngestion] Saved: {}", entry.getTitle());
                        } else {
                            skippedCount++;
                        }
                    } catch (Throwable t) {
                        log.error("[NewsIngestion] Failure on entry '{}': {}", entry.getTitle(), t.getMessage());
                        skippedCount++;
                    }
                    // Wait 30s between AI calls — extreme measures for heavy rate limiting
                    Thread.sleep(30000); 
                }
            } catch (Throwable t) {
                log.error("[NewsIngestion] Failed to process feed {}: {}", feedUrl, t.getMessage());
                errors.add(feedUrl + ": " + t.getMessage());
            }
        }

        this.lastSavedCount = savedCount;
        this.lastRunTime = LocalDateTime.now();
        log.info("[NewsIngestion] Completed. Total Saved: {}, Skipped: {}", savedCount, skippedCount);
        return Map.of("saved", savedCount, "skipped", skippedCount, "errors", errors);
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

        // Skip articles older than 48 hours to ensure "Fresh News"
        Date pubDate = entry.getPublishedDate();
        if (pubDate != null) {
            long ageInMillis = System.currentTimeMillis() - pubDate.getTime();
            long maxAge = 2L * 24 * 60 * 60 * 1000; // 48 hours
            if (ageInMillis > maxAge) {
                log.info("[NewsIngestion] Skipping old article ({}h old): {}", ageInMillis / 3600000, entry.getTitle());
                return false;
            }
        }

        if (biteRepository.existsByOriginalSourceUrl(sourceUrl)) return false;

        String rawTitle = entry.getTitle() != null ? entry.getTitle().trim() : "";
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
            "gemini-2.5-flash", "gemini-2.0-flash", 
            "gemini-1.5-flash", "gemini-pro"
        );
        
        while (retryCount < modelsToTry.size()) {
            String currentModel = modelsToTry.get(retryCount);
            try {
                // Flash 1.5 often needs v1beta, Pro and 2.0+ use v1
                String apiVersion = currentModel.contains("1.5") ? "v1beta" : "v1";
                String url = "https://generativelanguage.googleapis.com/" + apiVersion + "/models/" + currentModel + ":generateContent?key=" + geminiApiKey;
                
                Map response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("User-Agent", "TechBite-News-Aggregator/3.0")
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
                
                try { Thread.sleep(5000); } catch (InterruptedException ignored) {}
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
        bite.setThumbnailUrl(thumbUrl);
        bite.setOriginalSourceUrl(sourceUrl);
        bite.setAuthorAttribution(parseAuthor(entry));
        bite.setCategory(categoryOpt.get());
        bite.setStatus(Bite.Status.PUBLISHED);
        bite.setPublishedAt(entry.getPublishedDate() != null
                ? entry.getPublishedDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime()
                : LocalDateTime.now());

        biteRepository.saveAndFlush(bite);
        log.info("[NewsIngestion] ✅ Saved: '{}'", bite.getTitle());
        return true;
    }

    private String extractImage(SyndEntry entry) {
        if (entry.getEnclosures() != null && !entry.getEnclosures().isEmpty()) {
            return entry.getEnclosures().get(0).getUrl();
        }
        if (entry.getForeignMarkup() != null) {
            return entry.getForeignMarkup().stream()
                .filter(el -> el.getName().equals("content") || el.getName().equals("thumbnail"))
                .map(el -> el.getAttributeValue("url"))
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        }
        return null;
    }

    private String buildPrompt(String title, String description) {
        String categories = String.join(", ", KNOWN_CATEGORIES);
        return """
            You are a Senior Tech Lead and Career Mentor at a top tech company (like Google or Microsoft).
            Your goal is to explain this news to a Computer Science student or a fresher preparing for interviews.
            
            Article:
            TITLE: %s
            CONTENT: %s
            
            Format your response exactly as follows:
            TITLE: <Punchy, professional title, max 80 characters>
            CATEGORY: <Choose one from: %s>
            SUMMARY: <A 110-150 word breakdown. 
            - Start with a clear summary of the event.
            - Then, provide an 'Interview/Career Perspective': Explain how this relates to concepts like System Design, DSA, Operating Systems, or industry hiring trends.
            - Use actionable, clear, and encouraging language.>
            
            Rules:
            - If this is purely gossip, politics, or not relevant to a developer's career, respond: SKIP
            - Focus on 'The Why' behind the technology.
            """.formatted(title, description.substring(0, Math.min(description.length(), 1000)), categories);
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
        String text = "";
        if (entry.getDescription() != null) {
            text = entry.getDescription().getValue();
        } else if (!entry.getContents().isEmpty()) {
            text = entry.getContents().get(0).getValue();
        }
        return text.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private String parseAuthor(SyndEntry entry) {
        if (entry.getAuthor() != null && !entry.getAuthor().isBlank()) {
            return entry.getAuthor();
        }
        return null;
    }

    private record ParsedBite(String title, String categoryName, String summary) {}
}
