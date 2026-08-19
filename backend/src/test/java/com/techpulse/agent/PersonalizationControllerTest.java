package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.controller.PersonalizationController;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.*;
import com.techpulse.personalization.service.PersonalizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;
import org.springframework.cache.Cache;
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
    private TechnologyEventRepository technologyEventRepository;
    private UserSavedEventRepository userSavedEventRepository;
    private UserHistoryLogRepository userHistoryLogRepository;
    private UserCollectionRepository userCollectionRepository;
    private CollectionEventRepository collectionEventRepository;
    private UserFollowRepository userFollowRepository;
    private UserRepository userRepository;
    private InteractionLogRepository interactionLogRepository;
    private PersonalizationService personalizationService;
    private CacheManager cacheManager;

    @BeforeEach
    public void setUp() {
        technologyEventRepository = mock(TechnologyEventRepository.class);
        userSavedEventRepository = mock(UserSavedEventRepository.class);
        userHistoryLogRepository = mock(UserHistoryLogRepository.class);
        userCollectionRepository = mock(UserCollectionRepository.class);
        collectionEventRepository = mock(CollectionEventRepository.class);
        userFollowRepository = mock(UserFollowRepository.class);
        userRepository = mock(UserRepository.class);
        interactionLogRepository = mock(InteractionLogRepository.class);
        personalizationService = mock(PersonalizationService.class);
        cacheManager = mock(CacheManager.class);
        
        Cache mockCache = mock(Cache.class);
        when(cacheManager.getCache(anyString())).thenReturn(mockCache);

        PersonalizationController controller = new PersonalizationController(
                technologyEventRepository, userSavedEventRepository, userHistoryLogRepository,
                userCollectionRepository, collectionEventRepository, userFollowRepository,
                userRepository, interactionLogRepository, personalizationService, cacheManager
        );

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken("mock-uid", "credentials");
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    public void testGetFeeds() throws Exception {
        when(technologyEventRepository.findAll()).thenReturn(new ArrayList<>());
        when(personalizationService.rankEvents(any(), any())).thenReturn(new ArrayList<>());

        mockMvc.perform(get("/api/v1/feed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    public void testSearch() throws Exception {
        when(technologyEventRepository.findAll()).thenReturn(new ArrayList<>());

        mockMvc.perform(get("/api/v1/search").param("query", "java"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
