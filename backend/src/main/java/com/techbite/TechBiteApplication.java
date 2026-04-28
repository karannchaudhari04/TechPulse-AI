package com.techbite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TechBiteApplication {

    public static void main(String[] args) {
        SpringApplication.run(TechBiteApplication.class, args);
    }
}
