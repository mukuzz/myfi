package com.myfi.scraping.controller;

import com.myfi.scraping.model.AccountCredentials;
import com.myfi.scraping.model.ScrapingStatusResponse;

import com.myfi.scraping.service.ScrapingService;

import lombok.extern.slf4j.Slf4j;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

@Slf4j
@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST})
@RequestMapping("/api/v1/scraping")
@Validated
public class AccountScrapingController {

    @Autowired
    private ScrapingService scrapingService;

    @PostMapping(value = "/scrape", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> scrapeAccounts(
        @RequestBody @NotEmpty(message = "Credentials list cannot be empty") List<@Valid AccountCredentials> credentialsList
    ) {
        log.info("Received scrape request for {} accounts. Forwarding to ScrapingService.", credentialsList.size());
        scrapingService.submitScrapingTasks(credentialsList);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/status")
    public ResponseEntity<ScrapingStatusResponse> getScrapingStatus() {
        log.debug("Received status request. Forwarding to ScrapingService.");
        ScrapingStatusResponse response = scrapingService.getScrapingStatus();
        return ResponseEntity.ok(response);
    }
}