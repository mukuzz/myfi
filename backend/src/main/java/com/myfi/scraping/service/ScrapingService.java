package com.myfi.scraping.service;

import com.myfi.scraping.model.AccountCredentials;
import com.myfi.scraping.model.ScrapingStatusResponse;

import java.util.List;

/**
 * Service interface for handling account scraping operations.
 */
public interface ScrapingService {

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