package com.techpulse.config;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
    "spring.sql.init.mode=never"
})
@ActiveProfiles("test")
public class FlywayMigrationTest {

    @Autowired
    private Flyway flyway;

    @Test
    public void whenContextLoads_flywayMigrationsShouldRunSuccessfully() {
        assertNotNull(flyway);
        assertTrue(flyway.info().all().length > 0);
    }
}
