package com.techpulse.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void publicEndpoints_shouldBeAccessibleWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/v1/feed"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/feed/trending"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/search").param("query", "Spring"))
                .andExpect(status().isOk());
    }

    @Test
    public void protectedEndpoints_shouldRejectWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/v1/feed/recommended"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/user/follow"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/user/bookmark"))
                .andExpect(status().isUnauthorized());
    }
}
