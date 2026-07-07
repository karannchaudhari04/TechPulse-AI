package com.techpulse.agent;

import com.techpulse.model.InteractionLog;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.model.UserInterest;
import com.techpulse.repository.InteractionLogRepository;
import com.techpulse.repository.TechnologyEventRepository;
import com.techpulse.repository.UserInterestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class InterestExtractionAgentTest {

    private InteractionLogRepository interactionLogRepository;
    private UserInterestRepository userInterestRepository;
    private TechnologyEventRepository technologyEventRepository;
    private InterestExtractionAgent interestExtractionAgent;

    @BeforeEach
    public void setUp() {
        interactionLogRepository = mock(InteractionLogRepository.class);
        userInterestRepository = mock(UserInterestRepository.class);
        technologyEventRepository = mock(TechnologyEventRepository.class);
        interestExtractionAgent = new InterestExtractionAgent(
                interactionLogRepository, userInterestRepository, technologyEventRepository
        );
    }

    @Test
    public void testProcessInteractionsForUser() {
        Long userId = 1L;
        String eventId = "test-event-1";

        InteractionLog log = InteractionLog.builder()
                .userId(userId)
                .eventId(eventId)
                .interactionType("BOOKMARK")
                .createdAt(LocalDateTime.now())
                .build();

        TechnologyEvent event = TechnologyEvent.builder()
                .id(eventId)
                .title("Spring Boot release")
                .categoriesJson("[\"Web Development\"]")
                .entitiesJson("[\"Spring Boot\"]")
                .build();

        when(interactionLogRepository.findByUserId(userId)).thenReturn(List.of(log));
        when(technologyEventRepository.findById(eventId)).thenReturn(Optional.of(event));

        interestExtractionAgent.processInteractionsForUser(userId);

        verify(userInterestRepository, atLeastOnce()).save(any(UserInterest.class));
    }
}
