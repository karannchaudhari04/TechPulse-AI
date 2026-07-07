package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.controller.PersonalizationController;
import com.techpulse.agent.dto.RecommendationDTO;
import com.techpulse.agent.dto.SearchResultDTO;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.*;
import com.techpulse.service.RecommendationService;
import com.techpulse.service.SearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.*;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public class PersonalizationControllerTest {

    private MockMvc mockMvc;
    private RecommendationService recommendationService;
    private SearchService searchService;
    private CollectionAgent collectionAgent;
    private UserFollowRepository userFollowRepository;
    private UserSavedEventRepository userSavedEventRepository;
    private InteractionLogRepository interactionLogRepository;
    private NotificationEventRepository notificationEventRepository;
    private UserRepository userRepository;
    private EventSimilarityEngine eventSimilarityEngine;
    private TechnologyEventRepository technologyEventRepository;
    private InterestExtractionAgent interestExtractionAgent;

    @BeforeEach
    public void setUp() {
        recommendationService = mock(RecommendationService.class);
        searchService = mock(SearchService.class);
        collectionAgent = mock(CollectionAgent.class);
        userFollowRepository = mock(UserFollowRepository.class);
        userSavedEventRepository = mock(UserSavedEventRepository.class);
        interactionLogRepository = mock(InteractionLogRepository.class);
        notificationEventRepository = mock(NotificationEventRepository.class);
        userRepository = mock(UserRepository.class);
        eventSimilarityEngine = mock(EventSimilarityEngine.class);
        technologyEventRepository = mock(TechnologyEventRepository.class);
        interestExtractionAgent = mock(InterestExtractionAgent.class);

        PersonalizationController controller = new PersonalizationController(
                recommendationService, searchService, collectionAgent,
                userFollowRepository, userSavedEventRepository, interactionLogRepository,
                notificationEventRepository, userRepository, eventSimilarityEngine, 
                technologyEventRepository, interestExtractionAgent
        );

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken("mock-uid", "credentials");
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    public void testGetFeeds() throws Exception {
        when(recommendationService.getRecommendations(any(), anyInt())).thenReturn(new ArrayList<>());

        mockMvc.perform(get("/api/v1/feed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    public void testSearch() throws Exception {
        when(searchService.search(anyString(), any())).thenReturn(new ArrayList<>());

        mockMvc.perform(get("/api/v1/search").param("query", "java"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
