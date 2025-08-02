package com.myfi.refresh.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.myfi.mailscraping.service.GmailService;
import com.myfi.refresh.dto.AggregatedRefreshStatusResponse;
import com.myfi.refresh.service.RefreshTrackingService;

import lombok.extern.slf4j.Slf4j;

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
    private GmailService gmailService;


    @PostMapping("/trigger-full-refresh")
    public ResponseEntity<Map<String, String>> triggerFullRefresh() {
        log.info("Received request to trigger full refresh (Gmail Sync).");
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
