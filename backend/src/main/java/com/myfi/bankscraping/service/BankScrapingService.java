package com.myfi.bankscraping.service;

import java.util.List;

import com.myfi.bankscraping.model.AccountCredentials;
import com.myfi.bankscraping.model.ScrapingStatusResponse;

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

    /**
     * Retrieves the current status of the ongoing or last completed scraping batch.
     *
     * @return A ScrapingStatusResponse containing the progress of each account and overall status.
     */
    ScrapingStatusResponse getScrapingStatus();

} 