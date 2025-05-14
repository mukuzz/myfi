package com.myfi.refreshTracker.enums;

public enum RefreshJobStatus {
    PENDING,             // Operation is queued but not yet started
    INITIALIZING,        // Initial setup phase
    ACQUIRING_PERMIT,    // Specific to bank scraping, waiting for semaphore
    LOGIN_STARTED,
    LOGIN_SUCCESS,
    LOGIN_FAILED,
    PROCESSING_STARTED,  // Generic term for scraping or email processing started
    BANK_PROCESSING_STARTED, // Specific for bank transaction scraping
    CC_PROCESSING_STARTED,   // Specific for credit card transaction scraping
    PROCESSING_IN_PROGRESS, // For operations that process multiple items (e.g., emails)
    PROCESSING_SUCCESS,
    PROCESSING_FAILED,
    LOGOUT_STARTED,
    LOGOUT_SUCCESS,
    LOGOUT_FAILED,
    COMPLETED,           // Operation finished successfully without errors that halted it
    ERROR                // Operation encountered an unrecoverable error or finished with errors
} 