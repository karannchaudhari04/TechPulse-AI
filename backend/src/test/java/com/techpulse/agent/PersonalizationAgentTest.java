package com.techpulse.agent;

import com.techpulse.model.TechnologyEvent;
import com.techpulse.model.UserInterest;
import com.techpulse.model.UserInterestId;
import com.techpulse.repository.InteractionLogRepository;
import com.techpulse.repository.TechnologyEventRepository;
import com.techpulse.repository.UserHistoryLogRepository;
import com.techpulse.repository.UserInterestRepository;
import com.techpulse.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class PersonalizationAgentTest {

    private UserInterestRepository userInterestRepository;
    private UserHistoryLogRepository userHistoryLogRepository;
    private TechnologyEventRepository technologyEventRepository;
    private InteractionLogRepository interactionLogRepository;
    private UserRepository userRepository;
    private PersonalizationAgent personalizationAgent;

    @BeforeEach
    public void setUp() {
        userInterestRepository = mock(UserInterestRepository.class);
        userHistoryLogRepository = mock(UserHistoryLogRepository.class);
        technologyEventRepository = mock(TechnologyEventRepository.class);
        interactionLogRepository = mock(InteractionLogRepository.class);
        userRepository = mock(UserRepository.class);

        personalizationAgent = new PersonalizationAgent(
                userInterestRepository, userHistoryLogRepository,
                technologyEventRepository, interactionLogRepository, userRepository
        );
    }

    @Test
    public void testRecordInteractionLike() {
        TechnologyEvent event = TechnologyEvent.builder()
                .id("event-123")
                .categoriesJson("[\"Web Development\"]")
                .entitiesJson("[\"React\"]")
                .build();

        when(technologyEventRepository.findById("event-123")).thenReturn(Optional.of(event));

        UserInterestId catId = new UserInterestId(1L, "CATEGORY", "Web Development");
        when(userInterestRepository.findById(catId)).thenReturn(Optional.empty());

        UserInterestId topicId = new UserInterestId(1L, "TOPIC", "React");
        when(userInterestRepository.findById(topicId)).thenReturn(Optional.empty());

        personalizationAgent.recordInteraction(1L, "event-123", "LIKE", "1");

        // delta weight for LIKE is 3.0
        verify(userInterestRepository, times(2)).save(any(UserInterest.class));
        verify(interactionLogRepository, times(1)).save(any());
    }

    @Test
    public void testRankEventsGuestFallback() {
        TechnologyEvent event1 = TechnologyEvent.builder()
                .id("event-1")
                .importanceScore(90.0)
                .credibilityScore(80.0)
                .firstSeen(LocalDateTime.now())
                .build();

        TechnologyEvent event2 = TechnologyEvent.builder()
                .id("event-2")
                .importanceScore(50.0)
                .credibilityScore(90.0)
                .firstSeen(LocalDateTime.now())
                .build();

        List<TechnologyEvent> candidates = new ArrayList<>(List.of(event2, event1));

        // Guest user (userId = null) -> returns cold start score comparison (event1 should rank higher)
        List<TechnologyEvent> ranked = personalizationAgent.rankEvents(null, candidates);

        assertEquals("event-1", ranked.get(0).getId());
    }
}
