package com.techpulse.agent;

import com.techpulse.model.TechnologyEvent;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

public class EventSimilarityEngineTest {

    private final EventSimilarityEngine engine = new EventSimilarityEngine();

    @Test
    public void testCalculateSimilarity() {
        LocalDateTime now = LocalDateTime.now();
        TechnologyEvent e1 = TechnologyEvent.builder()
                .id("event-1")
                .entitiesJson("[\"Spring Boot\"]")
                .categoriesJson("[\"Web Development\"]")
                .versionString("3.2.0")
                .firstSeen(now)
                .build();

        TechnologyEvent e2 = TechnologyEvent.builder()
                .id("event-2")
                .entitiesJson("[\"Spring Boot\"]")
                .categoriesJson("[\"Web Development\"]")
                .versionString("3.2.0")
                .firstSeen(now)
                .build();

        double similarity = engine.calculateSimilarity(e1, e2);
        assertEquals(1.0, similarity, 0.001);
    }
}
