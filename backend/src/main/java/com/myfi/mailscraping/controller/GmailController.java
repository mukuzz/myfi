package com.myfi.mailscraping.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.myfi.mailscraping.service.GmailService;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/gmail")
public class GmailController {

    private static final Logger logger = LoggerFactory.getLogger(GmailController.class);

    @Autowired
    private GmailService gmailService;

    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> triggerEmailSync() {
        logger.info("Received request to trigger Gmail sync.");
        try {
            List<String> processedIds = gmailService.syncAndProcessEmails();
            logger.info("Gmail sync process completed. Found {} messages.", processedIds.size());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Gmail sync triggered successfully.",
                    "foundMessagesCount", processedIds.size()
            ));
        } catch (IllegalStateException e) {
            logger.error("Gmail sync failed: Authentication required.", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "message", "Authentication required. Please connect Gmail first.",
                    "error", e.getMessage()
            ));
        } catch (IOException e) {
            logger.error("Gmail sync failed due to API error.", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Failed to sync emails due to an API error.",
                    "error", e.getMessage()
            ));
        } catch (Exception e) {
            logger.error("An unexpected error occurred during Gmail sync.", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "An unexpected error occurred during sync.",
                    "error", e.getMessage()
            ));
        }
    }
} 