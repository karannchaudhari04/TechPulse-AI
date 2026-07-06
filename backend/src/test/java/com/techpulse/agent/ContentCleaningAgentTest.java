package com.techpulse.agent;

import com.techpulse.agent.dto.CleanedUpdateDTO;
import com.techpulse.agent.dto.RawUpdateDTO;
import com.techpulse.agent.model.SourceType;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit test verifying HTML tag stripping, URL normalization, and invalid records rejection.
 */
public class ContentCleaningAgentTest {

    private final ContentCleaningAgent agent = new ContentCleaningAgent();

    @Test
    public void testHtmlRemovalAndWhitespaceNormalization() {
        RawUpdateDTO raw = RawUpdateDTO.builder()
                .title("<p>Title <b>with HTML</b></p>")
                .rawContent("<div class=\"content\">\nThis is line 1.\n\n\nThis is line 2.\n</div>")
                .sourceUrl("http://foo.com/bar")
                .sourceType(SourceType.RSS)
                .fetchedAt(LocalDateTime.now())
                .publishedAt(LocalDateTime.now())
                .build();

        Optional<CleanedUpdateDTO> cleanedOpt = agent.process(raw);
        assertTrue(cleanedOpt.isPresent());

        CleanedUpdateDTO cleaned = cleanedOpt.get();
        assertEquals("Title with HTML", cleaned.getTitle());
        assertEquals("This is line 1.\n\nThis is line 2.", cleaned.getCleanedContent());
    }

    @Test
    public void testUrlParameterCleaningAndNormalization() {
        RawUpdateDTO raw = RawUpdateDTO.builder()
                .title("Title")
                .rawContent("Content")
                .sourceUrl("HTTPS://Foo.Com//bar/?utm_source=feed&fbclid=123&other=val#fragment")
                .sourceType(SourceType.RSS)
                .fetchedAt(LocalDateTime.now())
                .publishedAt(LocalDateTime.now())
                .build();

        Optional<CleanedUpdateDTO> cleanedOpt = agent.process(raw);
        assertTrue(cleanedOpt.isPresent());

        CleanedUpdateDTO cleaned = cleanedOpt.get();
        assertEquals("https://foo.com/bar?other=val", cleaned.getSourceUrl());
        assertEquals("https://foo.com/bar?other=val", cleaned.getCanonicalUrl());
    }

    @Test
    public void testInvalidUpdateRejection() {
        RawUpdateDTO missingTitle = RawUpdateDTO.builder()
                .title("")
                .rawContent("Content")
                .sourceUrl("http://foo.com")
                .build();

        Optional<CleanedUpdateDTO> cleanedOpt1 = agent.process(missingTitle);
        assertFalse(cleanedOpt1.isPresent());

        RawUpdateDTO missingUrl = RawUpdateDTO.builder()
                .title("Title")
                .rawContent("Content")
                .sourceUrl("")
                .build();

        Optional<CleanedUpdateDTO> cleanedOpt2 = agent.process(missingUrl);
        assertFalse(cleanedOpt2.isPresent());
    }
}
