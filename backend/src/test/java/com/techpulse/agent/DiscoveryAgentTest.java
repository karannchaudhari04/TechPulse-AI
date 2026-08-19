package com.techpulse.agent;

import com.techpulse.agent.collector.SourceCollector;
import com.techpulse.agent.dto.RawUpdateDTO;
import com.techpulse.agent.model.SourceType;
import com.techpulse.agent.registry.SourceRegistryImpl;
import com.techpulse.model.NewsSource;
import com.techpulse.model.RawIngestion;
import com.techpulse.repository.NewsSourceRepository;
import com.techpulse.repository.RawIngestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class DiscoveryAgentTest {

    private NewsSourceRepository newsSourceRepository;
    private SourceCollector mockCollector;
    private SourceRegistryImpl sourceRegistry;
    private RawIngestionRepository rawIngestionRepository;
    private DiscoveryAgent discoveryAgent;

    @BeforeEach
    public void setUp() {
        newsSourceRepository = mock(NewsSourceRepository.class);
        mockCollector = mock(SourceCollector.class);
        rawIngestionRepository = mock(RawIngestionRepository.class);
        when(mockCollector.getSupportedType()).thenReturn(SourceType.RSS);

        sourceRegistry = new SourceRegistryImpl(List.of(mockCollector));
        discoveryAgent = new DiscoveryAgent(newsSourceRepository, sourceRegistry, rawIngestionRepository, 2);
    }

    @Test
    public void testDiscoverUniqueAndDuplicateUrl() {
        NewsSource source = new NewsSource();
        source.setName("Source 1");
        source.setUrl("http://source1.com/rss");
        source.setActive(true);

        when(newsSourceRepository.findByActiveTrue()).thenReturn(List.of(source));

        // Two updates: one unique, one duplicate URL
        RawUpdateDTO update1 = RawUpdateDTO.builder()
                .title("Unique Title")
                .rawContent("Content 1")
                .sourceUrl("http://source1.com/unique")
                .canonicalUrl("http://source1.com/unique")
                .sourceName("Source 1")
                .sourceType(SourceType.RSS)
                .publishedAt(LocalDateTime.now())
                .build();

        RawUpdateDTO update2 = RawUpdateDTO.builder()
                .title("Duplicate URL Title")
                .rawContent("Content 2")
                .sourceUrl("http://source1.com/duplicate")
                .canonicalUrl("http://source1.com/duplicate")
                .sourceName("Source 1")
                .sourceType(SourceType.RSS)
                .publishedAt(LocalDateTime.now())
                .build();

        when(mockCollector.collect(any(), eq("Source 1"), eq("http://source1.com/rss")))
                .thenReturn(List.of(update1, update2));

        // Stub database candidates: empty (no prior history)
        when(rawIngestionRepository.findRecentRawIngestions(any())).thenReturn(new ArrayList<>());
        
        // Mock DB lookups
        when(rawIngestionRepository.findByUrlHash(anyString())).thenReturn(Optional.empty());
        // For update2, let's simulate it is a duplicate in DB URL match
        String duplicateUrlHash = com.techpulse.common.HashUtil.sha256("http://source1.com/duplicate");
        RawIngestion existing = new RawIngestion();
        existing.setEventId("event-existing-123");
        existing.setUrlHash(duplicateUrlHash);
        when(rawIngestionRepository.findByUrlHash(duplicateUrlHash)).thenReturn(Optional.of(existing));

        List<RawIngestion> uniqueResults = discoveryAgent.discoverAndDeduplicate();

        assertNotNull(uniqueResults);
        assertEquals(1, uniqueResults.size());
        assertEquals("Unique Title", uniqueResults.get(0).getTitle());
        verify(rawIngestionRepository, times(1)).saveAll(anyList());
    }

    @Test
    public void testDeduplicateByTitleFingerprint() {
        NewsSource source = new NewsSource();
        source.setName("Source 1");
        source.setUrl("http://source1.com/rss");
        source.setActive(true);

        when(newsSourceRepository.findByActiveTrue()).thenReturn(List.of(source));

        RawUpdateDTO update = RawUpdateDTO.builder()
                .title("React 19 Release Candidates")
                .rawContent("Content text")
                .sourceUrl("http://source1.com/react-19")
                .canonicalUrl("http://source1.com/react-19")
                .sourceName("Source 1")
                .sourceType(SourceType.RSS)
                .publishedAt(LocalDateTime.now())
                .build();

        when(mockCollector.collect(any(), eq("Source 1"), eq("http://source1.com/rss")))
                .thenReturn(List.of(update));

        when(rawIngestionRepository.findRecentRawIngestions(any())).thenReturn(new ArrayList<>());
        when(rawIngestionRepository.findByUrlHash(anyString())).thenReturn(Optional.empty());

        // Simulate title fingerprint hash match in DB
        String titleHash = com.techpulse.common.HashUtil.sha256("react 19 release candidates");
        RawIngestion match = new RawIngestion();
        match.setEventId("event-react-19");
        match.setTitle("React 19 Release Candidates");
        when(rawIngestionRepository.findByTitleHash(titleHash)).thenReturn(List.of(match));

        List<RawIngestion> uniqueResults = discoveryAgent.discoverAndDeduplicate();
        assertTrue(uniqueResults.isEmpty());
    }
}
