package com.myfi.controller;

import com.myfi.service.SystemStatusService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.is;

@WebMvcTest(SystemStatusController.class)
class SystemStatusControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SystemStatusService systemStatusService;

    @Test
    void getLastScrapeTime_shouldReturnTimeWhenFound() throws Exception {
        long expectedTime = Instant.now().toEpochMilli();
        given(systemStatusService.getLastScrapeTime()).willReturn(Optional.of(expectedTime));

        mockMvc.perform(get("/api/v1/status/last-scrape-time"))
               .andExpect(status().isOk())
               .andExpect(content().contentType("application/json"))
               .andExpect(jsonPath("$", is(expectedTime)));
    }

    @Test
    void getLastScrapeTime_shouldReturnNotFoundWhenMissing() throws Exception {
        given(systemStatusService.getLastScrapeTime()).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/status/last-scrape-time"))
               .andExpect(status().isNotFound());
    }
} 