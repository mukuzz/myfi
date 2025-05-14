package com.myfi.bankscraping.service;

import java.util.List;

import com.myfi.bankscraping.model.AccountCredentials;

/**
 * Service interface for handling account scraping operations.
 */
public interface BankScrapingService {

    /**
     * Submits a list of account credentials for scraping.
     * The scraping process runs asynchronously in the background.
     *
     * @param credentialsList The list of account credentials to scrape.
     */
    void submitScrapingTasks(List<AccountCredentials> credentialsList);

} 