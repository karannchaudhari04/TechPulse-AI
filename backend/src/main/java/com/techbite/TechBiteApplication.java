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
            if (categoryRepository.count() == 0) {
                List<String> categories = List.of(
                    "Artificial Intelligence", "Web Development", "Data Structures",
                    "Cybersecurity", "Hardware & Chips", "System Design", 
                    "Open Source", "Career Tips"
                );
                categories.forEach(name -> {
                    Category cat = new Category();
                    cat.setName(name);
                    categoryRepository.save(cat);
                });
                System.out.println(">>> [System] Seeded " + categories.size() + " categories.");
            }
        };
    }
}
