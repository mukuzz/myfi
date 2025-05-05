package com.myfi.bankscraping.model;

/**
 * Represents the possible states of a scraping task for a single account.
 */
public enum ScrapingStatus {
    PENDING,           // Task queued, not yet started
    ACQUIRING_PERMIT,  // Waiting for bank-specific semaphore
    LOGIN_STARTED,
    LOGIN_SUCCESS,
    LOGIN_FAILED,
    SCRAPING_STARTED,  // Generic scraping started (bank or cc)
    SCRAPING_BANK_STARTED,
    SCRAPING_CC_STARTED,
    SCRAPING_SUCCESS,  // Scraping part completed successfully
    SCRAPING_FAILED,   // Scraping part failed
    LOGOUT_STARTED,
    LOGOUT_SUCCESS,
    LOGOUT_FAILED,
    COMPLETED,         // Task finished successfully (including logout)
    ERROR              // Generic error state / Failed completion
} 