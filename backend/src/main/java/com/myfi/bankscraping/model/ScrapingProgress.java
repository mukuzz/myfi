package com.myfi.bankscraping.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;
import java.util.Collections;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingProgress {
    private String accountNumber;
    private String accountName; // Bank name (e.g., HDFC, ICICI)
    private ScrapingStatus status;
    private LocalDateTime startTime;
    private LocalDateTime lastUpdateTime;
    private String errorMessage; // Optional: Stores last error message if status is FAILED/ERROR
    private List<ScrapingEvent> history = new ArrayList<>();

    public ScrapingProgress(String accountNumber, String accountName) {
        this.accountNumber = accountNumber;
        this.accountName = accountName;
        this.startTime = LocalDateTime.now();
        updateStatus(ScrapingStatus.PENDING);
    }

    // Helper method to update status, timestamp, and add event
    public void updateStatus(ScrapingStatus newStatus) {
        LocalDateTime now = LocalDateTime.now();
        this.status = newStatus;
        this.lastUpdateTime = now;
        this.errorMessage = null; // Clear previous error message on non-error status change
        this.history.add(new ScrapingEvent(newStatus, now));
    }

    // Helper method to update status, timestamp, error message, and add event
    public void updateStatusWithError(ScrapingStatus newStatus, String error) {
        LocalDateTime now = LocalDateTime.now();
        this.status = newStatus;
        this.lastUpdateTime = now;
        this.errorMessage = error;
        this.history.add(new ScrapingEvent(newStatus, now, error));
    }

    // Make history read-only externally if needed
    public List<ScrapingEvent> getHistory() {
        return Collections.unmodifiableList(history);
    }
} 