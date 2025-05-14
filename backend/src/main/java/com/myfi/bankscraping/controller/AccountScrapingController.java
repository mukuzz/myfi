package com.myfi.bankscraping.controller;

import lombok.extern.slf4j.Slf4j;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.myfi.bankscraping.model.AccountCredentials;
import com.myfi.bankscraping.service.BankScrapingService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

@Slf4j
@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST})
@RequestMapping("/api/v1/scraping")
@Validated
public class AccountScrapingController {

    @Autowired
    private BankScrapingService scrapingService;

    @PostMapping(value = "/scrape", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> scrapeAccounts(
        @RequestBody @NotEmpty(message = "Credentials list cannot be empty") List<@Valid AccountCredentials> credentialsList
    ) {
        log.info("Received scrape request for {} accounts. Forwarding to ScrapingService.", credentialsList.size());
        scrapingService.submitScrapingTasks(credentialsList);
        return ResponseEntity.ok().build();
    }
}