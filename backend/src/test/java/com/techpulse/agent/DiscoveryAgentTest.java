package com.techpulse.agent;

import com.techpulse.agent.collector.SourceCollector;
import com.techpulse.agent.dto.DiscoveryResult;
import com.techpulse.agent.dto.RawUpdateDTO;
import com.techpulse.agent.model.SourceType;
import com.techpulse.agent.registry.SourceRegistryImpl;
import com.techpulse.model.NewsSource;
import com.techpulse.repository.NewsSourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test validating registry, concurrent fetching, and failure isolation in DiscoveryAgent.
 */
public class DiscoveryAgentTest {

    private NewsSourceRepository newsSourceRepository;
    private SourceCollector mockCollector;
    private SourceRegistryImpl sourceRegistry;
    private com.techpulse.repository.RawIngestionRepository rawIngestionRepository;
    private DiscoveryAgent discoveryAgent;

    @BeforeEach
    public void setUp() {
        newsSourceRepository = mock(NewsSourceRepository.class);
        mockCollector = mock(SourceCollector.class);
        rawIngestionRepository = mock(com.techpulse.repository.RawIngestionRepository.class);
        when(mockCollector.getSupportedType()).thenReturn(SourceType.RSS);

        sourceRegistry = new SourceRegistryImpl(List.of(mockCollector));
        discoveryAgent = new DiscoveryAgent(newsSourceRepository, sourceRegistry, rawIngestionRepository);
    }

    @Test
    public void testConcurrentDiscoverySuccess() {
        NewsSource source1 = new NewsSource();
        source1.setName("Source 1");
        source1.setUrl("http://source1.com/rss");
        source1.setActive(true);

        NewsSource source2 = new NewsSource();
        source2.setName("Source 2");
        source2.setUrl("http://source2.com/rss");
        source2.setActive(true);

        when(newsSourceRepository.findByActiveTrue()).thenReturn(List.of(source1, source2));

        RawUpdateDTO update1 = RawUpdateDTO.builder()
                .title("Update 1")
                .rawContent("Content 1")
                .sourceUrl("http://source1.com/1")
                .sourceName("Source 1")
                .sourceType(SourceType.RSS)
                .fetchedAt(LocalDateTime.now())
                .build();

        RawUpdateDTO update2 = RawUpdateDTO.builder()
                .title("Update 2")
                .rawContent("Content 2")
                .sourceUrl("http://source2.com/2")
                .sourceName("Source 2")
                .sourceType(SourceType.RSS)
                .fetchedAt(LocalDateTime.now())
                .build();

        PipelineContext context = new PipelineContext("test-run-id", LocalDateTime.now(), new HashMap<>());

        when(mockCollector.collect(any(), eq("Source 1"), eq("http://source1.com/rss"))).thenReturn(List.of(update1));
        when(mockCollector.collect(any(), eq("Source 2"), eq("http://source2.com/rss"))).thenReturn(List.of(update2));

        DiscoveryResult result = discoveryAgent.process(context);

        assertNotNull(result);
        assertEquals("test-run-id", result.runId());
        assertEquals(2, result.totalSources());
        assertEquals(2, result.successCount());
        assertEquals(0, result.failureCount());
        assertEquals(2, result.updates().size());
        assertTrue(result.failures().isEmpty());

        verify(mockCollector, times(1)).collect(any(), eq("Source 1"), eq("http://source1.com/rss"));
        verify(mockCollector, times(1)).collect(any(), eq("Source 2"), eq("http://source2.com/rss"));
        verify(rawIngestionRepository, times(1)).saveAll(anyList());
    }

    @Test
    public void testDiscoveryFailureIsolation() {
        NewsSource source1 = new NewsSource();
        source1.setName("Source 1");
        source1.setUrl("http://source1.com/rss");
        source1.setActive(true);

        NewsSource source2 = new NewsSource();
        source2.setName("Source 2");
        source2.setUrl("http://source2.com/rss");
        source2.setActive(true);

        when(newsSourceRepository.findByActiveTrue()).thenReturn(List.of(source1, source2));

        PipelineContext context = new PipelineContext("test-run-id-fail", LocalDateTime.now(), new HashMap<>());

        when(mockCollector.collect(any(), eq("Source 1"), eq("http://source1.com/rss"))).thenThrow(new RuntimeException("Connection timeout"));
        when(mockCollector.collect(any(), eq("Source 2"), eq("http://source2.com/rss"))).thenReturn(Collections.emptyList());

        DiscoveryResult result = discoveryAgent.process(context);

        assertNotNull(result);
        assertEquals("test-run-id-fail", result.runId());
        assertEquals(2, result.totalSources());
        assertEquals(1, result.successCount());
        assertEquals(1, result.failureCount());
        assertTrue(result.updates().isEmpty());
        assertEquals("Connection timeout", result.failures().get("http://source1.com/rss"));
    }
}
