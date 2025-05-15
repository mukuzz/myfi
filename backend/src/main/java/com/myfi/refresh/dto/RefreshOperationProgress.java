package com.myfi.refresh.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.myfi.refresh.enums.RefreshJobStatus;

@Getter
public class RefreshOperationProgress {
    private final String operationId; // Will be used as accountNumber in the response
    private final String operationName; // Will be used as accountName in the response
    
    @Setter
    private RefreshJobStatus status;
    
    @Setter
    private String statusMessage; // This will be the basis for errorMessage in the response
    
    private final LocalDateTime startTime;
    
    @Setter
    private LocalDateTime lastUpdateTime;
    
    private final List<ProgressHistoryEntry> history; // Changed from List<String>

    @Setter
    private int itemsProcessed;
    @Setter
    private int itemsTotal;

    public RefreshOperationProgress(String operationId, String operationName) {
        this.operationId = operationId;
        this.operationName = operationName;
        this.startTime = LocalDateTime.now();
        this.lastUpdateTime = LocalDateTime.now();
        this.status = RefreshJobStatus.PENDING;
        this.statusMessage = "Operation initiated"; // Default message
        this.history = new ArrayList<>();
        // Add initial history entry
        this.history.add(new ProgressHistoryEntry(this.status, this.startTime, this.statusMessage));
        this.itemsProcessed = 0;
        this.itemsTotal = 0;
    }

    public void updateStatus(RefreshJobStatus newStatus, String message) {
        LocalDateTime updateTime = LocalDateTime.now();
        this.status = newStatus;
        this.statusMessage = message;
        this.lastUpdateTime = updateTime;
        this.history.add(new ProgressHistoryEntry(newStatus, updateTime, message));
    }

    public void updateProgress(RefreshJobStatus newStatus, String message, int processedCount) {
        updateStatus(newStatus, message); // This will also add to history
        this.itemsProcessed = processedCount;
    }

    public void markAsError(String errorMessage) {
        // updateStatus will set this.statusMessage to errorMessage
        updateStatus(RefreshJobStatus.ERROR, errorMessage);
    }

    public boolean isTerminalState() {
        return this.status == RefreshJobStatus.COMPLETED || 
               this.status == RefreshJobStatus.ERROR ||
               this.status == RefreshJobStatus.LOGIN_FAILED ||
               this.status == RefreshJobStatus.PROCESSING_FAILED ||
               this.status == RefreshJobStatus.LOGOUT_FAILED;
    }

    // Getter for status that ensures statusMessage is treated as errorMessage if status is ERROR
    public String getErrorMessage() {
        if (this.status == RefreshJobStatus.ERROR || 
            this.status == RefreshJobStatus.LOGIN_FAILED || 
            this.status == RefreshJobStatus.PROCESSING_FAILED || 
            this.status == RefreshJobStatus.LOGOUT_FAILED) {
            return this.statusMessage;
        }
        return null; // No error message if not in an error state
    }
} 