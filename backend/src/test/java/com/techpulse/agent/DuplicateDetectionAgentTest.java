package com.techpulse.agent;

import com.techpulse.agent.dto.ClassifiedUpdateDTO;
import com.techpulse.agent.dto.CleanedUpdateDTO;
import com.techpulse.agent.dto.ValidatedUpdateDTO;
import com.techpulse.repository.RawIngestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit test validating exact URL duplicates, Jaro-Winkler similarity, and timestamp windows.
 */
public class DuplicateDetectionAgentTest {

    private RawIngestionRepository rawIngestionRepository;
    private DuplicateDetectionAgent duplicateDetectionAgent;

    @BeforeEach
    public void setUp() {
        rawIngestionRepository = mock(RawIngestionRepository.class);
        duplicateDetectionAgent = new DuplicateDetectionAgent(rawIngestionRepository);
    }

    @Test
    public void testExactUrlDuplicates() {
        LocalDateTime now = LocalDateTime.now();
        CleanedUpdateDTO clean1 = CleanedUpdateDTO.builder()
                .title("Unique Title 1")
                .cleanedContent("Unique Content 1")
                .sourceUrl("http://foo.com/duplicate")
                .canonicalUrl("http://foo.com/duplicate")
                .publishedAt(now)
                .build();

        CleanedUpdateDTO clean2 = CleanedUpdateDTO.builder()
                .title("Unique Title 2")
                .cleanedContent("Unique Content 2")
                .sourceUrl("http://bar.com/duplicate")
                .canonicalUrl("http://foo.com/duplicate") // Matches canonical URL
                .publishedAt(now)
                .build();

        ClassifiedUpdateDTO c1 = ClassifiedUpdateDTO.builder().cleanedUpdate(clean1).categoryConfidences(new HashMap<>()).build();
        ClassifiedUpdateDTO c2 = ClassifiedUpdateDTO.builder().cleanedUpdate(clean2).categoryConfidences(new HashMap<>()).build();

        when(rawIngestionRepository.findRecentRawIngestions(any())).thenReturn(Collections.emptyList());

        List<ValidatedUpdateDTO> result = duplicateDetectionAgent.process(List.of(c1, c2));

        assertEquals(2, result.size());
        assertFalse(result.get(0).isDuplicate());
        assertTrue(result.get(1).isDuplicate());
        assertEquals("EXACT_URL_BATCH", result.get(1).getMatchReason());
        assertEquals(result.get(0).getEventId(), result.get(1).getEventId()); // Reuses Event ID
    }

    @Test
    public void testJaroWinklerTitleMatchingWithinTimeWindow() {
        LocalDateTime now = LocalDateTime.now();
        CleanedUpdateDTO clean1 = CleanedUpdateDTO.builder()
                .title("Understanding Big O Complexity")
                .cleanedContent("Content 1")
                .sourceUrl("http://foo.com/1")
                .canonicalUrl("http://foo.com/1")
                .publishedAt(now)
                .build();

        CleanedUpdateDTO clean2 = CleanedUpdateDTO.builder()
                .title("Understanding Big O Complexities") // High Jaro-Winkler similarity
                .cleanedContent("Content 2")
                .sourceUrl("http://bar.com/2")
                .canonicalUrl("http://bar.com/2")
                .publishedAt(now.plusHours(12)) // Within 48 hours
                .build();

        ClassifiedUpdateDTO c1 = ClassifiedUpdateDTO.builder().cleanedUpdate(clean1).categoryConfidences(new HashMap<>()).build();
        ClassifiedUpdateDTO c2 = ClassifiedUpdateDTO.builder().cleanedUpdate(clean2).categoryConfidences(new HashMap<>()).build();

        when(rawIngestionRepository.findRecentRawIngestions(any())).thenReturn(Collections.emptyList());

        List<ValidatedUpdateDTO> result = duplicateDetectionAgent.process(List.of(c1, c2));

        assertEquals(2, result.size());
        assertFalse(result.get(0).isDuplicate());
        assertTrue(result.get(1).isDuplicate());
        assertEquals("TITLE_SIMILARITY_BATCH", result.get(1).getMatchReason());
        assertEquals(result.get(0).getEventId(), result.get(1).getEventId());
    }

    @Test
    public void testTitleMatchExceedingTimeWindow() {
        LocalDateTime now = LocalDateTime.now();
        CleanedUpdateDTO clean1 = CleanedUpdateDTO.builder()
                .title("Understanding Big O Complexity")
                .cleanedContent("Content 1")
                .sourceUrl("http://foo.com/1")
                .canonicalUrl("http://foo.com/1")
                .publishedAt(now)
                .build();

        CleanedUpdateDTO clean2 = CleanedUpdateDTO.builder()
                .title("Understanding Big O Complexities")
                .cleanedContent("Content 2")
                .sourceUrl("http://bar.com/2")
                .canonicalUrl("http://bar.com/2")
                .publishedAt(now.plusHours(72)) // Exceeds 48 hours
                .build();

        ClassifiedUpdateDTO c1 = ClassifiedUpdateDTO.builder().cleanedUpdate(clean1).categoryConfidences(new HashMap<>()).build();
        ClassifiedUpdateDTO c2 = ClassifiedUpdateDTO.builder().cleanedUpdate(clean2).categoryConfidences(new HashMap<>()).build();

        when(rawIngestionRepository.findRecentRawIngestions(any())).thenReturn(Collections.emptyList());

        List<ValidatedUpdateDTO> result = duplicateDetectionAgent.process(List.of(c1, c2));

        assertEquals(2, result.size());
        assertFalse(result.get(0).isDuplicate());
        assertFalse(result.get(1).isDuplicate()); // Not duplicate due to time window
        assertNotEquals(result.get(0).getEventId(), result.get(1).getEventId());
    }
}
