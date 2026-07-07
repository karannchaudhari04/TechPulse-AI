package com.techpulse.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class CorrelationIdFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void whenRequestReceived_shouldAddCorrelationIdHeader() throws Exception {
        mockMvc.perform(get("/api/v1/feed"))
                .andExpect(status().isOk())
                .andExpect(header().exists("X-Correlation-ID"));
    }

    @Test
    public void whenRequestHasCorrelationId_shouldPropagateIt() throws Exception {
        String testId = "my-custom-correlation-12345";
        mockMvc.perform(get("/api/v1/feed").header("X-Correlation-ID", testId))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Correlation-ID", testId));
    }
}
