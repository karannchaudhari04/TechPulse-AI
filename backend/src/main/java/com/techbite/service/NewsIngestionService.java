package com.techbite.service;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import com.techbite.model.Bite;
import com.techbite.model.Category;
import com.techbite.repository.BiteRepository;
import com.techbite.repository.CategoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URL;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Fetches tech news from free RSS feeds, uses Gemini AI to summarize and
 * categorize each article, then saves them as Bites in the database.
 *
 * Runs automatically every 6 hours. Can also be triggered manually via
 * POST /api/v1/admin/news/ingest
 */
@Service
public class NewsIngestionService {

    private static final Logger log = LoggerFactory.getLogger(NewsIngestionService.class);

    // ── Free RSS feeds — no API key required ────────────────────────────────
    private static final List<String> RSS_FEEDS = List.of(
        "https://techcrunch.com/feed/",
        "https://www.theverge.com/rss/index.xml",
        "https://feeds.arstechnica.com/arstechnica/index",
        "https://hnrss.org/frontpage",                    // Hacker News top stories
        "https://dev.to/feed",
        "https://www.wired.com/feed/rss",
        "https://feeds.feedburner.com/TheHackersNews"
    );

    // ── Category names must match what's in the DB `categories` table ───────
    private static final List<String> KNOWN_CATEGORIES = List.of(
        "Artificial Intelligence", "Web Development", "Data Structures",
        "Cybersecurity", "Hardware & Chips", "System Design",
        "Open Source", "Career Tips"
    );

    private final BiteRepository biteRepository;
    private final CategoryRepository categoryRepository;
    private final ChatClient chatClient;

    public NewsIngestionService(BiteRepository biteRepository,
                                CategoryRepository categoryRepository,
                                ChatClient.Builder chatClientBuilder) {
        this.biteRepository = biteRepository;
        this.categoryRepository = categoryRepository;
        this.chatClient = chatClientBuilder.build();
    }

    // ── Scheduled: runs every 6 hours ────────────────────────────────────────
    @Scheduled(cron = "0 0 */6 * * *")
    public void scheduledIngest() {
        log.info("[NewsIngestion] Scheduled run started at {}", LocalDateTime.now());
        ingestAllFeeds();
    }

    // ── Manual trigger ────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> ingestAllFeeds() {
        int savedCount = 0;
        int skippedCount = 0;
        List<String> errors = new ArrayList<>();

        for (String feedUrl : RSS_FEEDS) {
            try {
                log.info("[NewsIngestion] Fetching feed: {}", feedUrl);
                List<SyndEntry> entries = fetchRssFeed(feedUrl);

                for (SyndEntry entry : entries) {
                    try {
                        boolean saved = processAndSaveEntry(entry);
                        if (saved) savedCount++;
                        else skippedCount++;
                    } catch (Exception e) {
                        log.warn("[NewsIngestion] Failed to process entry '{}': {}", entry.getTitle(), e.getMessage());
                        skippedCount++;
                    }
                    // Be polite to Gemini API — small delay between requests
                    Thread.sleep(1500);
                }
            } catch (Exception e) {
                String msg = "Feed failed [" + feedUrl + "]: " + e.getMessage();
                log.error("[NewsIngestion] {}", msg);
                errors.add(msg);
            }
        }

        log.info("[NewsIngestion] Done. Saved={}, Skipped={}", savedCount, skippedCount);
        return Map.of("saved", savedCount, "skipped", skippedCount, "errors", errors);
    }

    // ── Fetch + parse a single RSS/Atom feed ─────────────────────────────────
    private List<SyndEntry> fetchRssFeed(String feedUrl) throws Exception {
        URL url = new URL(feedUrl);
        try (XmlReader reader = new XmlReader(url)) {
            SyndFeed feed = new SyndFeedInput().build(reader);
            // Take at most 5 entries per feed per run to stay within Gemini free limits
            return feed.getEntries().stream().limit(5).toList();
        }
    }

    // ── Process one RSS entry: deduplicate → AI summarize → save ─────────────
    private boolean processAndSaveEntry(SyndEntry entry) {
        String sourceUrl = entry.getLink();
        if (sourceUrl == null || sourceUrl.isBlank()) return false;

        // Skip if we've already stored this article (deduplication by URL)
        if (biteRepository.existsByOriginalSourceUrl(sourceUrl)) {
            log.debug("[NewsIngestion] Skipping duplicate: {}", sourceUrl);
            return false;
        }

        String rawTitle = entry.getTitle() != null ? entry.getTitle().trim() : "";
        String rawDescription = extractText(entry);

        if (rawTitle.isBlank() || rawDescription.isBlank()) return false;

        // Ask Gemini to produce a student-friendly summary + pick a category
        String aiPrompt = buildPrompt(rawTitle, rawDescription);
        String aiResponse;
        try {
            aiResponse = chatClient.prompt().user(aiPrompt).call().content();
        } catch (Exception e) {
            log.error("[NewsIngestion] Gemini AI failed for '{}': {}", rawTitle, e.getMessage());
            return false;
        }

        // Parse the structured AI response
        ParsedBite parsed = parseAiResponse(aiResponse, rawTitle, sourceUrl);
        if (parsed == null) return false;

        // Find the matching category in DB (fallback to first category if not matched)
        Optional<Category> categoryOpt = categoryRepository.findByNameIn(
                new HashSet<>(Set.of(parsed.categoryName()))
        ).stream().findFirst();

        if (categoryOpt.isEmpty()) {
            log.warn("[NewsIngestion] No matching category for '{}'. Skipping.", parsed.categoryName());
            return false;
        }

        // Build and save the Bite
        Bite bite = new Bite();
        bite.setTitle(parsed.title());
        bite.setContentSummary(parsed.summary());
        bite.setOriginalSourceUrl(sourceUrl);
        bite.setAuthorAttribution(parseAuthor(entry));
        bite.setCategory(categoryOpt.get());
        bite.setStatus(Bite.Status.PUBLISHED);
        bite.setPublishedAt(entry.getPublishedDate() != null
                ? entry.getPublishedDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime()
                : LocalDateTime.now());

        biteRepository.save(bite);
        log.info("[NewsIngestion] ✅ Saved: '{}'", bite.getTitle());
        return true;
    }

    // ── Build the Gemini prompt ───────────────────────────────────────────────
    private String buildPrompt(String title, String description) {
        String categories = String.join(", ", KNOWN_CATEGORIES);
        return """
            You are a tech editor creating bite-sized news for CS students and software engineering freshers.
            
            Given this article:
            TITLE: %s
            DESCRIPTION: %s
            
            Respond ONLY in this exact format (no extra text):
            TITLE: <A punchy, engaging title, max 80 characters>
            CATEGORY: <Pick exactly one from: %s>
            SUMMARY: <A 100-120 word explanation in simple English. Start with what happened. Then explain why it matters for a CS student or developer. Use at most one bullet point if needed.>
            
            Rules:
            - If the article is NOT tech-related, respond with: SKIP
            - Never exceed 120 words in SUMMARY
            - TITLE must be under 80 characters
            """.formatted(title, description.substring(0, Math.min(description.length(), 800)), categories);
    }

    // ── Parse the structured AI response ─────────────────────────────────────
    private ParsedBite parseAiResponse(String response, String fallbackTitle, String sourceUrl) {
        if (response == null || response.trim().equalsIgnoreCase("SKIP")) {
            log.debug("[NewsIngestion] AI decided to skip non-tech article");
            return null;
        }

        String title = extractField(response, "TITLE");
        String category = extractField(response, "CATEGORY");
        String summary = extractField(response, "SUMMARY");

        if (title == null || category == null || summary == null) {
            log.warn("[NewsIngestion] AI response parsing failed for: {}", fallbackTitle);
            return null;
        }

        // Trim to model max lengths
        title = title.length() > 150 ? title.substring(0, 147) + "..." : title;

        return new ParsedBite(title, category.trim(), summary.trim());
    }

    // ── Extract a labelled field from the AI response ─────────────────────────
    private String extractField(String text, String field) {
        Pattern pattern = Pattern.compile("^" + field + ":\\s*(.+?)(?=\\n[A-Z]+:|$)",
                Pattern.MULTILINE | Pattern.DOTALL);
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(1).trim() : null;
    }

    // ── Extract plain text from RSS entry (strips HTML) ──────────────────────
    private String extractText(SyndEntry entry) {
        String text = "";
        if (entry.getDescription() != null) {
            text = entry.getDescription().getValue();
        } else if (!entry.getContents().isEmpty()) {
            text = entry.getContents().get(0).getValue();
        }
        // Strip HTML tags
        return text.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private String parseAuthor(SyndEntry entry) {
        if (entry.getAuthor() != null && !entry.getAuthor().isBlank()) {
            return entry.getAuthor();
        }
        return null;
    }

    // ── Value record for parsed AI output ────────────────────────────────────
    private record ParsedBite(String title, String categoryName, String summary) {}
}
