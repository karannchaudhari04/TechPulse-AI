package com.techpulse.agent.collector;

import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import com.techpulse.agent.PipelineContext;
import com.techpulse.agent.dto.RawUpdateDTO;
import com.techpulse.agent.model.SourceType;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URL;
import java.net.URLConnection;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * RSS source collector implementing retry logic and failure isolation.
 */
@Component
public class RssSourceCollector implements SourceCollector {

    private static final Logger log = LoggerFactory.getLogger(RssSourceCollector.class);
    private static final int MAX_ATTEMPTS = 3; // 1 initial + 2 retries
    private static final long RETRY_BACKOFF_MS = 1000;

    @Override
    public SourceType getSupportedType() {
        return SourceType.RSS;
    }

    @Override
    public List<RawUpdateDTO> collect(PipelineContext context, String sourceName, String sourceUrl) {
        String runId = context.runId();
        log.info("[RssCollector] [runId={}] Starting collection from source '{}' ({})", runId, sourceName, sourceUrl);

        SyndFeed feed = null;
        Exception lastException = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                feed = fetchFeedWithTimeout(sourceUrl);
                log.info("[RssCollector] [runId={}] Successfully fetched feed '{}' on attempt {}/{}", runId, sourceName, attempt, MAX_ATTEMPTS);
                break; // success
            } catch (Exception e) {
                lastException = e;
                log.warn("[RssCollector] [runId={}] Attempt {}/{} failed for '{}': {}", runId, attempt, MAX_ATTEMPTS, sourceName, e.getMessage());
                if (attempt < MAX_ATTEMPTS) {
                    try {
                        Thread.sleep(RETRY_BACKOFF_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Collection interrupted during retry backoff", ie);
                    }
                }
            }
        }

        if (feed == null) {
            log.error("[RssCollector] [runId={}] All {} attempts failed for '{}'. Error: {}", runId, MAX_ATTEMPTS, sourceName, lastException.getMessage());
            throw new RuntimeException("Failed to collect RSS feed after " + MAX_ATTEMPTS + " attempts: " + lastException.getMessage(), lastException);
        }

        List<RawUpdateDTO> rawUpdates = new ArrayList<>();
        String language = feed.getLanguage() != null ? feed.getLanguage() : "en";

        // Limit entries to 8 to match the original service design behavior
        List<SyndEntry> entries = feed.getEntries().stream().limit(8).toList();
        for (SyndEntry entry : entries) {
            try {
                RawUpdateDTO dto = mapToRawUpdate(entry, sourceName, language);
                if (dto != null) {
                    rawUpdates.add(dto);
                }
            } catch (Exception e) {
                log.warn("[RssCollector] [runId={}] Error mapping entry in feed '{}': {}", runId, sourceName, e.getMessage());
            }
        }

        log.info("[RssCollector] [runId={}] Completed collection from source '{}'. Fetched {} entries.", runId, sourceName, rawUpdates.size());
        return rawUpdates;
    }

    private SyndFeed fetchFeedWithTimeout(String feedUrl) throws Exception {
        URL url = new URL(feedUrl);
        URLConnection connection = url.openConnection();
        connection.setConnectTimeout(10000); // 10s connect timeout
        connection.setReadTimeout(10000);    // 10s read timeout
        connection.setRequestProperty("User-Agent", "TechPulse-News-Bot/1.0");

        SyndFeedInput input = new SyndFeedInput();
        try (XmlReader reader = new XmlReader(connection)) {
            return input.build(reader);
        }
    }

    private RawUpdateDTO mapToRawUpdate(SyndEntry entry, String sourceName, String language) {
        String sourceUrl = entry.getLink();
        if (sourceUrl == null || sourceUrl.isBlank()) return null;

        String title = entry.getTitle() != null ? entry.getTitle().trim() : "";
        if (title.isBlank()) return null;

        String rawContent = extractText(entry);
        if (rawContent.isBlank()) return null;

        String thumbUrl = extractImage(entry);

        LocalDateTime publishedAt = entry.getPublishedDate() != null
                ? entry.getPublishedDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime()
                : LocalDateTime.now();

        String author = entry.getAuthor() != null && !entry.getAuthor().isBlank() ? entry.getAuthor() : null;

        return RawUpdateDTO.builder()
                .title(title)
                .rawContent(rawContent)
                .sourceUrl(sourceUrl)
                .author(author)
                .thumbnailUrl(thumbUrl)
                .publishedAt(publishedAt)
                .sourceType(SourceType.RSS)
                .sourceName(sourceName)
                .fetchedAt(LocalDateTime.now())
                .canonicalUrl(sourceUrl)
                .language(language)
                .build();
    }

    private String extractText(SyndEntry entry) {
        String html = "";
        if (entry.getDescription() != null) {
            html = entry.getDescription().getValue();
        } else if (entry.getContents() != null && !entry.getContents().isEmpty()) {
            html = entry.getContents().get(0).getValue();
        }

        if (html == null || html.isBlank()) return "";
        Document doc = Jsoup.parse(html);
        return doc.text().trim();
    }

    private String extractImage(SyndEntry entry) {
        if (entry.getEnclosures() != null && !entry.getEnclosures().isEmpty()) {
            return entry.getEnclosures().get(0).getUrl();
        }

        if (entry.getForeignMarkup() != null) {
            String url = entry.getForeignMarkup().stream()
                    .filter(el -> el.getName().equals("content") || el.getName().equals("thumbnail"))
                    .map(el -> el.getAttributeValue("url"))
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse(null);
            if (url != null) return url;
        }

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
}
