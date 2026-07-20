package com.techpulse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import com.techpulse.repository.CategoryRepository;
import com.techpulse.model.Category;
import java.util.List;
import java.util.Map;

@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class,
    DataSourceTransactionManagerAutoConfiguration.class
})
@EnableAsync
@EnableScheduling
@EnableCaching
@EnableSchedulerLock(defaultLockAtMostFor = "10m")
public class TechPulseApplication {
    private static final Logger log = LoggerFactory.getLogger(TechPulseApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(TechPulseApplication.class, args);
    }

    @Bean
    public CommandLineRunner seedData(CategoryRepository categoryRepository, 
                                     com.techpulse.repository.NewsSourceRepository newsSourceRepository,
                                     com.techpulse.repository.TechnologyEventRepository technologyEventRepository) {
        return args -> {
            // Production-Safe seeding: Only one instance will succeed due to DB constraints
            // We use a simple check first to avoid unnecessary database pressure
            try {
                if (categoryRepository.count() == 0) {
                    log.info(">>> [System] Seeding categories...");
                    List<Category> cats = List.of(
                        "DSA & Problem Solving", "Web Development", "Mobile Development",
                        "AI & Machine Learning", "Cloud & DevOps", "System Design & Backend",
                        "Cybersecurity", "Data Science & Analytics", "Product & UI/UX",
                        "Open Source & GitHub", "Career & Placements", "Emerging Tech"
                    ).stream().map(name -> {
                        Category c = new Category();
                        c.setName(name);
                        return c;
                    }).toList();
                    categoryRepository.saveAllAndFlush(cats);
                }

                if (newsSourceRepository.count() == 0) {
                    log.info(">>> [System] Seeding news sources...");
                    List<com.techpulse.model.NewsSource> sources = List.of(
                        Map.entry("Economic Times Tech (ETTech)", "https://economictimes.indiatimes.com/tech/rssfeeds/13357204.cms"),
                        Map.entry("The Hindu Tech", "https://www.thehindu.com/sci-tech/technology/feeder/default.rss"),
                        Map.entry("YourStory Tech (Indian Startups)", "https://yourstory.com/category/tech/feed"),
                        Map.entry("GeeksforGeeks (India DSA/Prep)", "https://www.geeksforgeeks.org/feed/"),
                        Map.entry("Hacker News (FAANG/System Design)", "https://hnrss.org/frontpage"),
                        Map.entry("Dev.to (Developer Tutorials)", "https://dev.to/feed"),
                        Map.entry("FreeCodeCamp", "https://www.freecodecamp.org/news/rss/"),
                        Map.entry("Gadgets360 (NDTV Tech)", "https://gadgets.ndtv.com/rss/feeds"),
                        Map.entry("InfoQ (Architecture & Cloud)", "https://feed.infoq.com/"),
                        Map.entry("AWS Architecture Blog", "https://aws.amazon.com/blogs/architecture/feed/"),
                        Map.entry("Android Developers Blog", "https://android-developers.googleblog.com/feeds/posts/default"),
                        Map.entry("Kubernetes Blog (DevOps)", "https://kubernetes.io/feed.xml"),
                        Map.entry("HackerNoon", "https://hackernoon.com/feed"),
                        Map.entry("Towards Data Science", "https://towardsdatascience.com/feed"),
                        Map.entry("Smashing Magazine", "https://www.smashingmagazine.com/feed/"),
                        Map.entry("GitHub Blog", "https://github.blog/feed/"),
                        Map.entry("The Kotlin Blog", "https://blog.jetbrains.com/kotlin/feed/"),
                        Map.entry("Spring Blog", "https://spring.io/blog.xml"),
                        Map.entry("TechCrunch Startups", "https://techcrunch.com/category/startups/feed/"),
                        Map.entry("UX Collective", "https://uxdesign.cc/feed"),
                        Map.entry("KDnuggets", "https://www.kdnuggets.com/feed"),
                        Map.entry("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
                        Map.entry("Red Hat Developer", "https://developers.redhat.com/blog/feed")
                    ).stream().map(entry -> {
                        com.techpulse.model.NewsSource s = new com.techpulse.model.NewsSource();
                        s.setName(entry.getKey());
                        s.setUrl(entry.getValue());
                        return s;
                    }).toList();
                    newsSourceRepository.saveAll(sources);
                }

                if (technologyEventRepository.count() == 0) {
                    log.info(">>> [System] Seeding initial technology events for Home Feed...");
                    List<com.techpulse.model.TechnologyEvent> events = List.of(
                        com.techpulse.model.TechnologyEvent.builder()
                            .id("e1")
                            .title("Java 21 LTS: Production-Ready Virtual Threads & Concurrency")
                            .categoriesJson("[\"System Design & Backend\", \"AI & Machine Learning\"]")
                            .credibilityScore(98.0)
                            .importanceScore(94.0)
                            .mergeConfidence(1.0)
                            .firstSeen(java.time.LocalDateTime.now())
                            .lastUpdated(java.time.LocalDateTime.now())
                            .lifecycleStatus("RELEASED")
                            .majorVersion(21)
                            .minorVersion(0)
                            .patchVersion(0)
                            .versionString("21.0.0")
                            .entitiesJson("[\"Java\", \"Spring Boot\"]")
                            .summary("JDK 21 is a major LTS release introducing production-ready Virtual Threads (JEP 444) for high-throughput lightweight concurrency, pattern matching, and scoped values.")
                            .technicalImpact("Virtual threads scale application throughput with near-zero memory overhead compared to platform OS threads.")
                            .developerImpact("Accelerates developer velocity by keeping synchronous, blocking execution flows easy to write and debug.")
                            .enterpriseImpact("Reduces cloud compute infrastructure costs by maximizing server CPU and resource utilization.")
                            .officialLinksJson("[\"https://openjdk.org/jeps/444\"]")
                            .summaryStatus("NEW")
                            .build(),

                        com.techpulse.model.TechnologyEvent.builder()
                            .id("e2")
                            .title("React 19 Release: Server Actions & React Compiler")
                            .categoriesJson("[\"Web Development\"]")
                            .credibilityScore(96.0)
                            .importanceScore(92.0)
                            .mergeConfidence(1.0)
                            .firstSeen(java.time.LocalDateTime.now().minusHours(2))
                            .lastUpdated(java.time.LocalDateTime.now())
                            .lifecycleStatus("RELEASED")
                            .majorVersion(19)
                            .minorVersion(0)
                            .patchVersion(0)
                            .versionString("19.0.0")
                            .entitiesJson("[\"React\", \"NextJS\"]")
                            .summary("React 19 introduces automatic re-render optimization via the new React Compiler, alongside support for server actions and form hook states.")
                            .technicalImpact("Eliminates manual useMemo and useCallback hooks while reducing client bundle size.")
                            .developerImpact("Simplifies state tracking for forms and async server mutations.")
                            .enterpriseImpact("Improves web application performance and web vitals SEO ratings.")
                            .officialLinksJson("[\"https://react.dev/blog/2024/04/25/react-19\"]")
                            .summaryStatus("NEW")
                            .build(),

                        com.techpulse.model.TechnologyEvent.builder()
                            .id("e3")
                            .title("Kubernetes v1.30: GitOps & Structured Authorization Security")
                            .categoriesJson("[\"Cloud & DevOps\"]")
                            .credibilityScore(95.0)
                            .importanceScore(88.0)
                            .mergeConfidence(1.0)
                            .firstSeen(java.time.LocalDateTime.now().minusHours(4))
                            .lastUpdated(java.time.LocalDateTime.now())
                            .lifecycleStatus("RELEASED")
                            .majorVersion(1)
                            .minorVersion(30)
                            .patchVersion(0)
                            .versionString("1.30.0")
                            .entitiesJson("[\"Kubernetes\", \"Docker\"]")
                            .summary("Kubernetes v1.30 introduces structured authorization configuration and advanced security context profiles for container execution.")
                            .technicalImpact("Hardens sandbox container controls and enforces validation rules on admission webhooks.")
                            .developerImpact("Provides standardized resource allocation APIs and better diagnostics reporting.")
                            .enterpriseImpact("Secures enterprise cloud deployments against unauthorized sandbox container breakout exploits.")
                            .officialLinksJson("[\"https://kubernetes.io/blog/2024/04/17/kubernetes-v1-30-release/\"]")
                            .summaryStatus("NEW")
                            .build(),

                        com.techpulse.model.TechnologyEvent.builder()
                            .id("e4")
                            .title("Claude 3.5 Sonnet: Benchmark Leader in Autonomous Coding")
                            .categoriesJson("[\"AI & Machine Learning\"]")
                            .credibilityScore(97.0)
                            .importanceScore(95.0)
                            .mergeConfidence(1.0)
                            .firstSeen(java.time.LocalDateTime.now().minusHours(6))
                            .lastUpdated(java.time.LocalDateTime.now())
                            .lifecycleStatus("RELEASED")
                            .majorVersion(3)
                            .minorVersion(5)
                            .patchVersion(0)
                            .versionString("3.5.0")
                            .entitiesJson("[\"Claude\", \"OpenAI\"]")
                            .summary("Claude 3.5 Sonnet sets industry benchmarks for code generation, software architecture design, and complex multi-step reasoning.")
                            .technicalImpact("Achieves 64% on SWE-bench for solving real-world GitHub issues autonomously.")
                            .developerImpact("Powers AI artifact code preview tools and speeds up software engineering refactoring.")
                            .enterpriseImpact("Drives enterprise productivity in automated test suite generation and legacy code migration.")
                            .officialLinksJson("[\"https://www.anthropic.com/news/claude-3-5-sonnet\"]")
                            .summaryStatus("NEW")
                            .build(),

                        com.techpulse.model.TechnologyEvent.builder()
                            .id("e5")
                            .title("Android Jetpack Compose 1.7: Performance & Dynamic Color")
                            .categoriesJson("[\"Mobile Development\"]")
                            .credibilityScore(94.0)
                            .importanceScore(86.0)
                            .mergeConfidence(1.0)
                            .firstSeen(java.time.LocalDateTime.now().minusHours(8))
                            .lastUpdated(java.time.LocalDateTime.now())
                            .lifecycleStatus("RELEASED")
                            .majorVersion(1)
                            .minorVersion(7)
                            .patchVersion(0)
                            .versionString("1.7.0")
                            .entitiesJson("[\"Android\", \"Kotlin\"]")
                            .summary("Jetpack Compose 1.7 brings memory optimization, faster lazy layout rendering, and seamless Material 3 dynamic color integration.")
                            .technicalImpact("Reduces recomposition overhead and optimizes text layout calculations.")
                            .developerImpact("Simplifies UI building with declarative Kotlin APIs and preview annotations.")
                            .enterpriseImpact("Ensures responsive Android app user experiences across mobile and foldable devices.")
                            .officialLinksJson("[\"https://developer.android.com/jetpack/compose\"]")
                            .summaryStatus("NEW")
                            .build()
                    );
                    technologyEventRepository.saveAll(events);
                }
            } catch (Exception e) {
                // In production, if another instance already seeded, this might fail with a unique constraint.
                // We catch it and ignore it so the app continues to start normally.
                log.info(">>> [System] Seeding skipped (Data likely already present or seeded by another instance)");
            }
        };
    }
}
