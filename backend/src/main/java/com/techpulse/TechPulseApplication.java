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
                                     com.techpulse.repository.NewsSourceRepository newsSourceRepository) {
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
            } catch (Exception e) {
                // In production, if another instance already seeded, this might fail with a unique constraint.
                // We catch it and ignore it so the app continues to start normally.
                log.info(">>> [System] Seeding skipped (Data likely already present or seeded by another instance)");
            }
        };
    }
}
