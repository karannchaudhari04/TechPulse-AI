package com.techbite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import com.techbite.repository.CategoryRepository;
import com.techbite.model.Category;
import java.util.List;

@SpringBootApplication
@EnableScheduling
public class TechBiteApplication {

    public static void main(String[] args) {
        SpringApplication.run(TechBiteApplication.class, args);
    }

    @Bean
    public CommandLineRunner seedCategories(CategoryRepository categoryRepository) {
        return args -> {
            System.out.println(">>> [System] Checking categories...");
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
                System.out.println(">>> [System] SUCCESS: Seeded " + cats.size() + " categories.");
            } else {
                System.out.println(">>> [System] Categories already exist (Count: " + categoryRepository.count() + ")");
            }
        };
    }
}
