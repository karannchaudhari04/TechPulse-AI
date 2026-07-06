package com.techpulse.agent;

import com.techpulse.agent.dto.CleanedUpdateDTO;
import com.techpulse.agent.dto.RawUpdateDTO;
import com.techpulse.agent.util.UrlNormalizer;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Agent responsible for HTML cleaning, whitespace normalization, and URL sanitization.
 */
@Service
public class ContentCleaningAgent implements Agent<RawUpdateDTO, Optional<CleanedUpdateDTO>> {

    private static final Logger log = LoggerFactory.getLogger(ContentCleaningAgent.class);

    @Override
    public Optional<CleanedUpdateDTO> process(RawUpdateDTO input) {
        if (input == null) {
            return Optional.empty();
        }

        String rawTitle = input.getTitle();
        String rawUrl = input.getSourceUrl();

        // 1. Validation: Reject updates with missing title or URL
        if (rawTitle == null || rawTitle.isBlank() || rawUrl == null || rawUrl.isBlank()) {
            log.warn("[ContentCleaningAgent] Rejected update: missing title or URL.");
            return Optional.empty();
        }

        // 2. Clean HTML and normalize whitespace
        String cleanedTitle = cleanHtml(rawTitle);
        String cleanedContent = cleanHtml(input.getRawContent());

        if (cleanedTitle.isBlank() || cleanedContent.isBlank()) {
            log.warn("[ContentCleaningAgent] Rejected update: blank title or content after cleaning.");
            return Optional.empty();
        }

        // 3. URL Normalization
        String normalizedUrl = UrlNormalizer.normalize(rawUrl);
        String canonicalUrl = UrlNormalizer.normalize(input.getCanonicalUrl() != null ? input.getCanonicalUrl() : rawUrl);

        CleanedUpdateDTO cleanedUpdate = CleanedUpdateDTO.builder()
                .title(cleanedTitle)
                .cleanedContent(cleanedContent)
                .sourceUrl(normalizedUrl)
                .author(input.getAuthor())
                .thumbnailUrl(input.getThumbnailUrl())
                .publishedAt(input.getPublishedAt())
                .sourceType(input.getSourceType())
                .sourceName(input.getSourceName())
                .fetchedAt(input.getFetchedAt())
                .canonicalUrl(canonicalUrl)
                .language(input.getLanguage())
                .build();

        return Optional.of(cleanedUpdate);
    }

    private String cleanHtml(String html) {
        if (html == null) {
            return "";
        }
        Document doc = Jsoup.parse(html);
        String text = doc.body() != null ? doc.body().wholeText() : doc.text();

        // Normalize whitespace and duplicate blank lines
        text = text.replaceAll("\\r?\\n", "\n");
        text = text.replaceAll("\\n{3,}", "\n\n");
        text = text.replaceAll("[ \\t\\x0B\\f]+", " ");
        return text.trim();
    }
}
