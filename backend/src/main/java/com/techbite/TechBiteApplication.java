package com.techbite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import com.techbite.repository.CategoryRepository;
import com.techbite.model.Category;
import java.util.List;
import java.util.Map;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class TechBiteApplication {
    private static final Logger log = LoggerFactory.getLogger(TechBiteApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(TechBiteApplication.class, args);
    }

    @Bean
    public CommandLineRunner seedCategories(CategoryRepository categoryRepository) {
        return args -> {
            log.info(">>> [System] Checking categories...");
            if (categoryRepository.count() == 0) {
                List<Category> cats = List.of(
                    "Artificial Intelligence", "Web Development", "Data Structures",
                    "Cybersecurity", "Hardware & Chips", "System Design", 
                    "Open Source", "Career Tips"
                ).stream().map(name -> {
                    Category c = new Category();
                    c.setName(name);
                    return c;
                }).toList();
                
                categoryRepository.saveAllAndFlush(cats);
                log.info(">>> [System] SUCCESS: Seeded {} categories.", cats.size());
            } else {
                log.info(">>> [System] Categories already exist (Count: {})", categoryRepository.count());
            }
        };
    }

    @Bean
    public CommandLineRunner seedNewsSources(com.techbite.repository.NewsSourceRepository newsSourceRepository) {
        return args -> {
            if (newsSourceRepository.count() == 0) {
                List<com.techbite.model.NewsSource> sources = List.of(
                    Map.entry("TechCrunch", "https://techcrunch.com/feed/"),
                    Map.entry("The Verge", "https://www.theverge.com/rss/index.xml"),
                    Map.entry("Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"),
                    Map.entry("Hacker News", "https://hnrss.org/frontpage"),
                    Map.entry("Dev.to", "https://dev.to/feed"),
                    Map.entry("Wired", "https://www.wired.com/feed/rss"),
                    Map.entry("FreeCodeCamp", "https://www.freecodecamp.org/news/rss/"),
                    Map.entry("The Hindu Tech", "https://www.thehindu.com/sci-tech/technology/feeder/default.rss")
                ).stream().map(entry -> {
                    com.techbite.model.NewsSource s = new com.techbite.model.NewsSource();
                    s.setName(entry.getKey());
                    s.setUrl(entry.getValue());
                    return s;
                }).toList();
                newsSourceRepository.saveAll(sources);
                log.info(">>> [System] SUCCESS: Seeded {} news sources.", sources.size());
            }
        };
    }
}
