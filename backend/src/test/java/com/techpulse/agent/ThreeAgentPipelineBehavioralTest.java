package com.techpulse.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techpulse.agent.collector.SourceCollector;
import com.techpulse.agent.dto.AIRequest;
import com.techpulse.agent.dto.AIResponse;
import com.techpulse.agent.dto.RawUpdateDTO;
import com.techpulse.agent.model.SourceType;
import com.techpulse.model.NewsSource;
import com.techpulse.model.RawIngestion;
import com.techpulse.model.TechnologyEvent;
import com.techpulse.model.User;
import com.techpulse.repository.NewsSourceRepository;
import com.techpulse.repository.RawIngestionRepository;
import com.techpulse.repository.TechnologyEventRepository;
import com.techpulse.repository.UserRepository;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import net.javacrumbs.shedlock.core.LockProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
    "spring.sql.init.mode=never",
    "spring.data.redis.repositories.enabled=false",
    "spring.cache.type=none",
    "GEMINI_API_KEY=mock-key-for-synthesis-testing",
    "JWT_SECRET=mock-jwt-secret-key-of-at-least-256-bits-length-to-be-secure-for-testing"
})
@ActiveProfiles("test")
@Transactional
public class ThreeAgentPipelineBehavioralTest {

    @MockBean
    private RedisConnectionFactory redisConnectionFactory;

    @MockBean
    private ProxyManager<String> proxyManager;

    @MockBean
    private LockProvider lockProvider;

    @MockBean
    private RedisTemplate<String, Object> redisTemplate;

    @MockBean
    private SourceCollector sourceCollector;

    @MockBean
    private AIClient aiClient;

    @Autowired
    private DiscoveryAgent discoveryAgent;

    @Autowired
    private AISynthesisAgent aiSynthesisAgent;

    @Autowired
    private PersonalizationAgent personalizationAgent;

    @Autowired
    private NewsSourceRepository newsSourceRepository;

    @Autowired
    private RawIngestionRepository rawIngestionRepository;

    @Autowired
    private TechnologyEventRepository technologyEventRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.techpulse.agent.registry.SourceRegistry sourceRegistry;

    private NewsSource activeSource;

    @BeforeEach
    public void setUp() {
        newsSourceRepository.deleteAll();
        rawIngestionRepository.deleteAll();
        technologyEventRepository.deleteAll();
        userRepository.deleteAll();

        activeSource = new NewsSource();
        activeSource.setName("TechPulse Official");
        activeSource.setUrl("https://techpulse.com/feed.xml");
        activeSource.setActive(true);
        newsSourceRepository.save(activeSource);

        when(sourceCollector.getSupportedType()).thenReturn(SourceType.RSS);
        sourceRegistry.register(SourceType.RSS, sourceCollector);
    }

    @Test
    public void testDiscoveryAndLayeredDeduplication() {
        // Step 1: Discover a new unique article
        RawUpdateDTO article1 = RawUpdateDTO.builder()
                .title("Docker Desktop 5.0 Launched")
                .rawContent("Docker released Desktop version 5.0 with full hypervisor isolation.")
                .sourceUrl("https://docker.com/desktop-5")
                .canonicalUrl("https://docker.com/desktop-5")
                .sourceName("TechPulse Official")
                .sourceType(SourceType.RSS)
                .publishedAt(LocalDateTime.now())
                .build();

        when(sourceCollector.collect(any(), eq("TechPulse Official"), eq("https://techpulse.com/feed.xml")))
                .thenReturn(List.of(article1));

        List<RawIngestion> uniqueList1 = discoveryAgent.discoverAndDeduplicate();
        assertEquals(1, uniqueList1.size());
        RawIngestion raw1 = uniqueList1.get(0);
        assertEquals("Docker Desktop 5.0 Launched", raw1.getTitle());
        assertEquals(RawIngestion.ProcessingStatus.NEW, raw1.getProcessingStatus());

        // Synthesis for article 1
        String geminiResponse = "{\n" +
                "  \"title\": \"Docker Desktop 5.0 Released\",\n" +
                "  \"summary\": \"Docker desktop has major hypervisor isolation.\",\n" +
                "  \"category\": \"Cloud & DevOps\",\n" +
                "  \"topics\": [\"Docker\", \"Containers\"],\n" +
                "  \"importanceScore\": 90.0,\n" +
                "  \"credibilityScore\": 95.0,\n" +
                "  \"versionString\": \"5.0.0\",\n" +
                "  \"lifecycleStatus\": \"RELEASED\",\n" +
                "  \"technicalImpact\": \"Improves host isolation.\",\n" +
                "  \"developerImpact\": \"No breaking config changes.\",\n" +
                "  \"enterpriseImpact\": \"Low risk.\",\n" +
                "  \"migrationNotes\": \"Not confirmed.\",\n" +
                "  \"breakingChanges\": \"None\",\n" +
                "  \"securityNotes\": \"Fully secure.\",\n" +
                "  \"officialLinks\": [\"https://docker.com/desktop-5\"]\n" +
                "}";

        when(aiClient.generate(any(AIRequest.class))).thenReturn(
                AIResponse.builder()
                        .content(geminiResponse)
                        .promptTokens(100)
                        .completionTokens(150)
                        .latency(200L)
                        .provider("Gemini")
                        .build()
        );

        TechnologyEvent event = aiSynthesisAgent.synthesizeAndSave(raw1);
        assertNotNull(event);
        assertEquals("Docker Desktop 5.0 Released", event.getTitle());

        // Step 2: Discover same URL again (Exact Duplicate check)
        List<RawIngestion> uniqueList2 = discoveryAgent.discoverAndDeduplicate();
        assertTrue(uniqueList2.isEmpty());
        // Verify duplicate raw ingestion references same Event ID
        List<RawIngestion> duplicates = rawIngestionRepository.findAll().stream()
                .filter(r -> r.getProcessingStatus() == RawIngestion.ProcessingStatus.DUPLICATE)
                .toList();
        assertEquals(1, duplicates.size());
        assertEquals(raw1.getEventId(), duplicates.get(0).getEventId());

        // Step 3: Discover similar title fingerprint within 48h
        RawUpdateDTO article3 = RawUpdateDTO.builder()
                .title("Docker Desktop 5.0 Launched!") // slightly different title string
                .rawContent("Docker released Desktop version 5.0 with full hypervisor isolation.")
                .sourceUrl("https://docker.com/desktop-5-mirror") // different URL
                .canonicalUrl("https://docker.com/desktop-5-mirror")
                .sourceName("TechPulse Official")
                .sourceType(SourceType.RSS)
                .publishedAt(LocalDateTime.now())
                .build();

        when(sourceCollector.collect(any(), eq("TechPulse Official"), eq("https://techpulse.com/feed.xml")))
                .thenReturn(List.of(article3));

        List<RawIngestion> uniqueList3 = discoveryAgent.discoverAndDeduplicate();
        assertTrue(uniqueList3.isEmpty());
    }

    @Test
    public void testGeminiFailureRecovery() {
        RawUpdateDTO article = RawUpdateDTO.builder()
                .title("React 19 Release")
                .rawContent("React 19 brings Server Actions.")
                .sourceUrl("https://react.dev/blog/19")
                .canonicalUrl("https://react.dev/blog/19")
                .sourceName("TechPulse Official")
                .sourceType(SourceType.RSS)
                .publishedAt(LocalDateTime.now())
                .build();

        when(sourceCollector.collect(any(), eq("TechPulse Official"), eq("https://techpulse.com/feed.xml")))
                .thenReturn(List.of(article));

        List<RawIngestion> uniqueList = discoveryAgent.discoverAndDeduplicate();
        assertEquals(1, uniqueList.size());
        RawIngestion raw = uniqueList.get(0);

        // Simulate Gemini failure
        when(aiClient.generate(any())).thenThrow(new RuntimeException("Quota exceeded"));

        assertThrows(RuntimeException.class, () -> aiSynthesisAgent.synthesizeAndSave(raw));

        // Verify status remains NEW for retry and no event is saved
        RawIngestion updatedRaw = rawIngestionRepository.findById(raw.getId()).orElse(null);
        assertNotNull(updatedRaw);
        assertEquals(RawIngestion.ProcessingStatus.NEW, updatedRaw.getProcessingStatus());

        Optional<TechnologyEvent> eventOpt = technologyEventRepository.findById(raw.getEventId());
        assertTrue(eventOpt.isEmpty());
    }

    @Test
    public void testUserInteractionPersonalizationJourney() {
        // Create 3 Events
        TechnologyEvent eventAI = TechnologyEvent.builder()
                .id("ev-ai")
                .title("Gemini Pro API Upgrade")
                .categoriesJson("[\"AI & Machine Learning\"]")
                .entitiesJson("[\"Gemini\", \"AI\"]")
                .importanceScore(90.0)
                .credibilityScore(95.0)
                .firstSeen(LocalDateTime.now())
                .build();
        technologyEventRepository.save(eventAI);

        TechnologyEvent eventMobile = TechnologyEvent.builder()
                .id("ev-mobile")
                .title("React Native Expo 52")
                .categoriesJson("[\"Mobile Development\"]")
                .entitiesJson("[\"React Native\", \"Expo\"]")
                .importanceScore(80.0)
                .credibilityScore(90.0)
                .firstSeen(LocalDateTime.now())
                .build();
        technologyEventRepository.save(eventMobile);

        TechnologyEvent eventCloud = TechnologyEvent.builder()
                .id("ev-cloud")
                .title("Docker Scaling on AWS")
                .categoriesJson("[\"Cloud & DevOps\"]")
                .entitiesJson("[\"Docker\", \"AWS\"]")
                .importanceScore(70.0)
                .credibilityScore(85.0)
                .firstSeen(LocalDateTime.now())
                .build();
        technologyEventRepository.save(eventCloud);

        // Create User
        User user = new User();
        user.setEmail("test@techpulse.com");
        user.setDisplayName("Test User");
        user.setFirebaseUid("test-uid-123");
        userRepository.save(user);

        // Guest Ranking
        List<TechnologyEvent> listGuest = new ArrayList<>(List.of(eventCloud, eventMobile, eventAI));
        personalizationAgent.rankEvents(null, listGuest);
        // By default, based on quality + importance + recency: eventAI should rank first
        assertEquals("ev-ai", listGuest.get(0).getId());

        // Perform User Journey interactions
        personalizationAgent.recordInteraction(user.getId(), "ev-ai", "VIEW", "1");
        personalizationAgent.recordInteraction(user.getId(), "ev-ai", "LIKE", "1");
        personalizationAgent.recordInteraction(user.getId(), "ev-ai", "READ_COMPLETE", "1");
        
        // Skip Cloud event (lowers its interest score)
        personalizationAgent.recordInteraction(user.getId(), "ev-cloud", "SKIP", "1");

        // Personalize ranking
        List<TechnologyEvent> listUser = new ArrayList<>(List.of(eventCloud, eventMobile, eventAI));
        personalizationAgent.rankEvents(user.getId(), listUser);

        // Verify Event AI ranks first, and Event Cloud ranks last
        assertEquals("ev-ai", listUser.get(0).getId());
        assertEquals("ev-cloud", listUser.get(2).getId());
    }
}
