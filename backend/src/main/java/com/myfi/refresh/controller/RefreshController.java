package com.myfi.refresh.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.myfi.credentials.service.CredentialsService;
import com.myfi.bankscraping.model.AccountCredentials;
import com.myfi.bankscraping.service.BankScrapingService;
import com.myfi.mailscraping.service.GmailService;
import com.myfi.refresh.dto.AggregatedRefreshStatusResponse;
import com.myfi.refresh.service.RefreshTrackingService;

import jakarta.validation.constraints.NotBlank;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@RestController
@RequestMapping("/api/v1/refresh")
@Validated
public class RefreshController {

    @Autowired
    private RefreshTrackingService refreshTrackingService;

    @Autowired
    private CredentialsService credentialsService;

    @Autowired
    private BankScrapingService bankScrapingService;

    @Autowired
    private GmailService gmailService;


    @PostMapping("/trigger-full-refresh")
    public ResponseEntity<Map<String, String>> triggerFullRefresh(
            @RequestHeader("X-Master-Key") @NotBlank(message = "X-Master-Key header is required") String masterKey) {
        log.info("Received request to trigger full refresh (Bank Scraping & Gmail Sync).");

        // Trigger Bank Scraping Asynchronously
        try {
            List<AccountCredentials> credentialsList = credentialsService.getAllAccountCredentials(masterKey);
            if (credentialsList != null && !credentialsList.isEmpty()) {
                log.debug("Fetched account credentials.");
                bankScrapingService.submitScrapingTasks(credentialsList); // Assumed to be already async or handles async internally
            } else {
                log.debug("No bank credentials found or list is empty. Skipping bank scraping.");
            }
        } catch (Exception e) {
            log.error("Error during bank scraping initiation (master key or credential retrieval failed): {}", e.getMessage(), e);
            // Potentially return an error or partial success, but for now, just log and continue to Gmail sync trigger
            // If masterKey is invalid for credential fetching, this will be the first point of failure.
             if (e.getMessage().contains("Failed to decrypt credentials")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Master key invalid, failed to retrieve credentials for scraping."));
            }
            // For other exceptions during credential retrieval, we might still proceed to Gmail sync.
            // Or, decide to halt. For now, log and proceed.
            log.warn("Proceeding to Gmail sync despite error in bank scraping credential retrieval.");
        }

        // Trigger Gmail Sync Asynchronously
        try {
            log.info("Triggering Gmail sync.");
            CompletableFuture.runAsync(() -> gmailService.syncAndProcessEmails());
        } catch (Exception e) {
            // This catch is unlikely to be hit if triggerAsyncSyncAndProcessEmails is truly async
            // and handles its own exceptions, but as a safeguard:
            log.error("Unexpected error trying to *trigger* asynchronous Gmail sync: {}", e.getMessage(), e);
        }

        log.info("Full refresh triggered. Bank scraping and Gmail sync initiated asynchronously.");
        return ResponseEntity.accepted().body(Map.of("message", "Full refresh triggered. Operations initiated asynchronously."));
    }

    @GetMapping("/status")
    public ResponseEntity<AggregatedRefreshStatusResponse> getOverallStatus() {
        return ResponseEntity.ok(refreshTrackingService.getOverallRefreshStatus());
    }
}
