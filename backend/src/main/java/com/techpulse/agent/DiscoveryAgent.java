package com.techpulse.agent;

import com.techpulse.agent.collector.SourceCollector;
import com.techpulse.agent.dto.RawUpdateDTO;
import com.techpulse.agent.model.SourceType;
import com.techpulse.agent.registry.SourceRegistry;
import com.techpulse.agent.util.JaroWinklerSimilarity;
import com.techpulse.agent.util.UrlNormalizer;
import com.techpulse.common.HashUtil;
import com.techpulse.model.NewsSource;
import com.techpulse.model.RawIngestion;
import com.techpulse.repository.NewsSourceRepository;
import com.techpulse.repository.RawIngestionRepository;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

/**
 * Core Agent responsible for discovering tech news updates and executing layered deduplication.
 */
@Service
public class DiscoveryAgent {

    private static final Logger log = LoggerFactory.getLogger(DiscoveryAgent.class);
    private static final double SIMILARITY_THRESHOLD = 0.85;

    private final NewsSourceRepository newsSourceRepository;
    private final SourceRegistry sourceRegistry;
    private final RawIngestionRepository rawIngestionRepository;
    private final ExecutorService executorService;

    public DiscoveryAgent(NewsSourceRepository newsSourceRepository,
                          SourceRegistry sourceRegistry,
                          RawIngestionRepository rawIngestionRepository,
                          @Value("${app.discovery.thread-pool-size:10}") int threadPoolSize) {
        this.newsSourceRepository = newsSourceRepository;
        this.sourceRegistry = sourceRegistry;
        this.rawIngestionRepository = rawIngestionRepository;
        this.executorService = Executors.newFixedThreadPool(threadPoolSize);
    }

    @Transactional
    public List<RawIngestion> discoverAndDeduplicate() {
        String runId = UUID.randomUUID().toString();
        log.info("[DiscoveryAgent] Starting discovery run ID: {}", runId);

        List<NewsSource> activeSources = newsSourceRepository.findByActiveTrue();
        log.info("[DiscoveryAgent] Found {} active sources", activeSources.size());

        List<RawUpdateDTO> rawUpdates = Collections.synchronizedList(new ArrayList<>());
        PipelineContext context = new PipelineContext(runId, LocalDateTime.now(), new HashMap<>());

        List<CompletableFuture<Void>> futures = activeSources.stream()
                .map(source -> CompletableFuture.supplyAsync(() -> {
                    SourceCollector collector = sourceRegistry.getCollector(SourceType.RSS);
                    if (collector == null) {
                        throw new IllegalStateException("RSS source collector not found");
                    }
                    return collector.collect(context, source.getName(), source.getUrl());
                }, executorService)
                .thenAccept(rawUpdates::addAll)
                .exceptionally(ex -> {
                    log.error("[DiscoveryAgent] Failed fetching feed {}: {}", source.getName(), ex.getMessage());
                    return null;
                }))
                .toList();

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        log.info("[DiscoveryAgent] Fetched {} total candidate updates", rawUpdates.size());

        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<RawIngestion> dbCandidates = rawIngestionRepository.findRecentRawIngestions(since);

        List<RawIngestion> uniqueUpdates = new ArrayList<>();
        List<RawIngestion> allIngested = new ArrayList<>();

        for (RawUpdateDTO update : rawUpdates) {
            String title = update.getTitle();
            String rawUrl = update.getSourceUrl();

            if (title == null || title.isBlank() || rawUrl == null || rawUrl.isBlank()) {
                continue;
            }

            String cleanedTitle = cleanHtml(title);
            String cleanedContent = cleanHtml(update.getRawContent());

            if (cleanedTitle.isBlank() || cleanedContent.isBlank()) {
                continue;
            }

            String normalizedUrl = UrlNormalizer.normalize(rawUrl);
            String canonicalUrl = UrlNormalizer.normalize(update.getCanonicalUrl() != null ? update.getCanonicalUrl() : rawUrl);

            String urlHash = HashUtil.sha256(canonicalUrl);
            String titleHash = HashUtil.sha256(HashUtil.normalizeTitle(cleanedTitle));

            // Layered Duplicate Detection
            boolean isDuplicate = false;
            String matchedEventId = null;

            // Layer 1: Check in-memory batch for exact URL match
            for (RawIngestion ing : allIngested) {
                if (ing.getUrlHash().equals(urlHash)) {
                    isDuplicate = true;
                    matchedEventId = ing.getEventId();
                    break;
                }
            }

            // Layer 2: Check database for exact URL match
            if (!isDuplicate) {
                Optional<RawIngestion> dbUrlMatch = rawIngestionRepository.findByUrlHash(urlHash);
                if (dbUrlMatch.isPresent()) {
                    isDuplicate = true;
                    matchedEventId = dbUrlMatch.get().getEventId();
                }
            }

            // Layer 3: Check database for exact Title Fingerprint match
            if (!isDuplicate) {
                List<RawIngestion> dbTitleMatches = rawIngestionRepository.findByTitleHash(titleHash);
                if (!dbTitleMatches.isEmpty()) {
                    isDuplicate = true;
                    matchedEventId = dbTitleMatches.get(0).getEventId();
                }
            }

            // Layer 4: Jaro-Winkler Similarity with Token-Overlap check against last 7 days candidates
            if (!isDuplicate) {
                LocalDateTime publishedTime = update.getPublishedAt() != null ? update.getPublishedAt() : LocalDateTime.now();
                for (RawIngestion cand : dbCandidates) {
                    LocalDateTime candPubAt = cand.getPublishedAt() != null ? cand.getPublishedAt() : cand.getFetchedAt();
                    long hourDiff = Math.abs(Duration.between(publishedTime, candPubAt).toHours());
                    if (hourDiff <= 48) {
                        // Pre-filter: only compute Jaro-Winkler if there is token overlap
                        if (HashUtil.hasTokenOverlap(cleanedTitle, cand.getTitle())) {
                            double sim = JaroWinklerSimilarity.calculate(cleanedTitle, cand.getTitle());
                            if (sim >= SIMILARITY_THRESHOLD) {
                                isDuplicate = true;
                                matchedEventId = cand.getEventId();
                                break;
                            }
                        }
                    }
                }
            }

            RawIngestion entity = new RawIngestion();
            entity.setId(UUID.randomUUID().toString());
            entity.setRunId(runId);
            entity.setSourceName(update.getSourceName());
            entity.setSourceType(update.getSourceType());
            entity.setTitle(cleanedTitle);
            entity.setRawContent(cleanedContent);
            entity.setUrl(normalizedUrl);
            entity.setCanonicalUrl(canonicalUrl);
            entity.setUrlHash(urlHash);
            entity.setTitleHash(titleHash);
            entity.setPublishedAt(update.getPublishedAt());
            entity.setFetchedAt(LocalDateTime.now());

            boolean isUrlDuplicate = false;
            // Check if it matched URL in Layer 1 or Layer 2
            for (RawIngestion ing : allIngested) {
                if (ing.getUrlHash().equals(urlHash)) {
                    isUrlDuplicate = true;
                    break;
                }
            }
            if (!isUrlDuplicate) {
                Optional<RawIngestion> dbUrlMatch = rawIngestionRepository.findByUrlHash(urlHash);
                if (dbUrlMatch.isPresent()) {
                    isUrlDuplicate = true;
                }
            }

            if (isDuplicate) {
                entity.setProcessingStatus(RawIngestion.ProcessingStatus.DUPLICATE);
                entity.setEventId(matchedEventId != null ? matchedEventId : UUID.randomUUID().toString());
                log.debug("[DiscoveryAgent] Duplicate detected for title '{}' (Event ID: {})", cleanedTitle, entity.getEventId());
            } else {
                entity.setProcessingStatus(RawIngestion.ProcessingStatus.NEW);
                entity.setEventId(UUID.randomUUID().toString());
                uniqueUpdates.add(entity);
                log.info("[DiscoveryAgent] Unique article discovered: '{}' (Event ID: {})", cleanedTitle, entity.getEventId());
            }

            // Only save if it is not an exact URL duplicate (to respect unique index on url_hash)
            if (!isUrlDuplicate) {
                allIngested.add(entity);
            }
        }

        if (!allIngested.isEmpty()) {
            rawIngestionRepository.saveAll(allIngested);
        }

        log.info("[DiscoveryAgent] Ingestion Discovery finished. Total ingested: {}, Unique updates found: {}", 
                allIngested.size(), uniqueUpdates.size());

        return uniqueUpdates;
    }

    private String cleanHtml(String html) {
        if (html == null) {
            return "";
        }
        Document doc = Jsoup.parse(html);
        String text = doc.body() != null ? doc.body().wholeText() : doc.text();
        text = text.replaceAll("\\r?\\n", "\n");
        text = text.replaceAll("\\n{3,}", "\n\n");
        text = text.replaceAll("[ \\t\\x0B\\f]+", " ");
        return text.trim();
    }
}
