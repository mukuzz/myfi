package com.myfi.scraping.controller;

import com.myfi.model.Account;
import com.myfi.scraping.model.AccountCredentials;
import com.myfi.scraping.model.ScrapingProgress;
import com.myfi.scraping.model.ScrapingStatus;
import com.myfi.scraping.model.ScrapingStatusResponse;
import com.myfi.scraping.service.BankScrapper;
import com.myfi.scraping.service.impl.HDFCBankScraper;
import com.myfi.scraping.service.impl.ICICIBankScraper;
import com.myfi.service.AccountService;
import com.myfi.service.SystemStatusService;

import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Callable;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

@Slf4j
@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST})
@RequestMapping("/api/v1/scraping")
@Validated
public class AccountScrapingController {

    @Autowired
    private AccountService accountService;
    @Autowired
    private SystemStatusService systemStatusService;

    @Autowired
    private ICICIBankScraper iciciBankScraper;

    @Autowired
    private HDFCBankScraper hdfcBankScraper;

    @Autowired
    @Qualifier("scrapingExecutor")
    private ExecutorService executor;

    private final ConcurrentHashMap<String, Semaphore> bankSemaphores = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ScrapingProgress> scrapingProgressMap = new ConcurrentHashMap<>();

    @PostMapping(value = "/scrape", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> scrapeAccounts(
        @RequestBody @NotEmpty(message = "Credentials list cannot be empty") List<@Valid AccountCredentials> credentialsList
    ) {
        // Clear the progress map for the new request
        log.info("Clearing previous scraping progress map for new request.");
        scrapingProgressMap.clear();

        // Initialize progress map for this batch
        for (AccountCredentials creds : credentialsList) {
            scrapingProgressMap.computeIfAbsent(creds.getAccountNumber(), 
                accNum -> new ScrapingProgress(accNum, creds.getAccountName()));
        }
        submitScrapingTasks(credentialsList);
        log.info("Submitted {} scraping tasks for background execution.", credentialsList.size());
        return ResponseEntity.ok().build();
    }

    private void submitScrapingTasks(List<AccountCredentials> credentialsList) {
        log.info("Submitting scraping tasks for {} accounts.", credentialsList.size());

        for (AccountCredentials credentials : credentialsList) {
            final String accountNumberToScrape = credentials.getAccountNumber();
            ScrapingProgress progress = scrapingProgressMap.get(accountNumberToScrape);
            if (progress == null) {
                log.error("Progress object not found for account {} during task submission. Skipping.", accountNumberToScrape);
                continue;
            }
            
            Callable<Void> task = () -> {
                Optional<Account> optionalAccount = accountService.getAccountByAccountNumber(accountNumberToScrape);
                boolean taskError = false; 

                if (optionalAccount.isEmpty()) {
                    log.warn("Account not found for account number: {}", accountNumberToScrape);
                    progress.updateStatusWithError(ScrapingStatus.ERROR, "Account not found in DB");
                    taskError = true;
                }
                
                Account account = null;
                BankScrapper bankScrapper = null;
                String bankName = "UNKNOWN";
                Semaphore bankSemaphore = null;
                boolean loginSuccess = false;
                String determinedScrapeType = "UNKNOWN";

                if (!taskError) {
                    account = optionalAccount.get();
                    bankName = account.getName().toUpperCase();
                    bankSemaphore = bankSemaphores.computeIfAbsent(bankName, k -> new Semaphore(1));

                    try {
                        log.info("Attempting to acquire permit for bank: {}", bankName);
                        progress.updateStatus(ScrapingStatus.ACQUIRING_PERMIT);
                        bankSemaphore.acquire(); 
                        log.info("Permit acquired for bank: {}. Proceeding with scraping for account: {}", bankName, accountNumberToScrape);

                        if (credentials.getAccountName().equalsIgnoreCase("ICICI")) {
                            bankScrapper = iciciBankScraper;
                        } else if (credentials.getAccountName().equalsIgnoreCase("HDFC")) {
                            bankScrapper = hdfcBankScraper;
                        } else {
                            log.error("Invalid bank name provided: {}", credentials.getAccountName());
                            progress.updateStatusWithError(ScrapingStatus.ERROR, "Invalid bank name: " + credentials.getAccountName());
                            taskError = true;
                        }

                        if (!taskError) {
                            log.info("Attempting login for account number: {}", accountNumberToScrape);
                            progress.updateStatus(ScrapingStatus.LOGIN_STARTED);
                            loginSuccess = bankScrapper.login(credentials);

                            if (!loginSuccess) {
                                log.error("Login failed for account number: {}. Skipping scraping.", accountNumberToScrape);
                                progress.updateStatusWithError(ScrapingStatus.LOGIN_FAILED, "Login attempt failed");
                                taskError = true;
                            } else {
                                log.info("Login successful for account number: {}. Proceeding with scraping.", accountNumberToScrape);
                                progress.updateStatus(ScrapingStatus.LOGIN_SUCCESS);
                                progress.updateStatus(ScrapingStatus.SCRAPING_STARTED);
                                Account.AccountType accountType = account.getType();
                                
                                if (accountType == Account.AccountType.SAVINGS) {
                                    determinedScrapeType = "BANK";
                                    progress.updateStatus(ScrapingStatus.SCRAPING_BANK_STARTED);
                                    log.info("Scraping BANK transactions for account number: {} (Type: {})", accountNumberToScrape, accountType);
                                    bankScrapper.scrapeBankTransactions(account);
                                    log.info("BANK scraping successful for account number: {}", accountNumberToScrape);
                                    progress.updateStatus(ScrapingStatus.SCRAPING_SUCCESS);
                                } else if (accountType == Account.AccountType.CREDIT_CARD) {
                                    determinedScrapeType = "CREDIT_CARD";
                                    progress.updateStatus(ScrapingStatus.SCRAPING_CC_STARTED);
                                    log.info("Scraping CREDIT CARD transactions for account number: {} (Type: {})", accountNumberToScrape, accountType);
                                    bankScrapper.scrapeCreditCardTransactions(account);
                                    log.info("CREDIT CARD scraping successful for account number: {}", accountNumberToScrape);
                                    progress.updateStatus(ScrapingStatus.SCRAPING_SUCCESS);
                                } else {
                                    log.warn("Unsupported account type ({}) for scraping account number: {}. Skipping.", accountType, accountNumberToScrape);
                                    progress.updateStatus(ScrapingStatus.COMPLETED);
                                }
                            }
                        }

                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        log.error("Semaphore acquisition interrupted for bank {} account {}: {}", bankName, accountNumberToScrape, ie.getMessage(), ie);
                        progress.updateStatusWithError(ScrapingStatus.ERROR, "Interrupted while waiting for permit");
                        taskError = true;
                    } catch (Exception e) {
                        log.error("Error during {} scraping for account number {}: {}", determinedScrapeType, accountNumberToScrape, e.getMessage(), e);
                        progress.updateStatusWithError(ScrapingStatus.SCRAPING_FAILED, "Error during " + determinedScrapeType + ": " + e.getMessage());
                        taskError = true;
                    } finally {
                        if (bankScrapper != null && loginSuccess) { 
                            try {
                                log.info("Attempting logout for account: {}", accountNumberToScrape);
                                progress.updateStatus(ScrapingStatus.LOGOUT_STARTED);
                                bankScrapper.logout();
                                log.info("Logout successful for account: {}", accountNumberToScrape);
                                progress.updateStatus(ScrapingStatus.LOGOUT_SUCCESS);
                            } catch (Exception logoutEx) {
                                log.error("Error during logout after {} scraping attempt for account number {}: {}", determinedScrapeType, accountNumberToScrape, logoutEx.getMessage(), logoutEx);
                                progress.updateStatusWithError(ScrapingStatus.LOGOUT_FAILED, "Logout error: " + logoutEx.getMessage());
                                taskError = true; 
                            }
                        }
                        if (taskError) {
                            if (progress.getStatus() != ScrapingStatus.LOGIN_FAILED && 
                                progress.getStatus() != ScrapingStatus.SCRAPING_FAILED && 
                                progress.getStatus() != ScrapingStatus.LOGOUT_FAILED && 
                                progress.getStatus() != ScrapingStatus.ERROR) {
                                progress.updateStatusWithError(ScrapingStatus.ERROR, "Task completed with errors");
                            }
                        } else if (progress.getStatus() != ScrapingStatus.COMPLETED) {
                             progress.updateStatus(ScrapingStatus.COMPLETED);
                             log.info("Updating last scrape time after successful completion for account {}", accountNumberToScrape);
                             systemStatusService.updateLastScrapeTime(); 
                        }
                        
                        if (bankSemaphore != null) {
                            log.debug("Attempting to release permit for bank: {} (Account: {})", bankName, accountNumberToScrape);
                            bankSemaphore.release(); 
                            log.info("Permit released for bank: {}. (Account: {})", bankName, accountNumberToScrape);
                        } else {
                            log.warn("Bank semaphore was null for bank {} (Account: {}), cannot release.", bankName, accountNumberToScrape);
                        }
                    }
                } else {
                     log.debug("Skipping main try-finally block as account {} was not found.", accountNumberToScrape);
                }
                return null;
            };
            
            executor.submit(task);
        }
    }

    @GetMapping("/status")
    public ResponseEntity<ScrapingStatusResponse> getScrapingStatus() {
        boolean isInProgress = false;
        if (!scrapingProgressMap.isEmpty()) {
            // Check if any task is not in a final state
            isInProgress = scrapingProgressMap.values().stream()
                .anyMatch(p -> 
                    p.getStatus() != ScrapingStatus.COMPLETED &&
                    p.getStatus() != ScrapingStatus.ERROR &&
                    p.getStatus() != ScrapingStatus.LOGIN_FAILED &&
                    p.getStatus() != ScrapingStatus.SCRAPING_FAILED &&
                    p.getStatus() != ScrapingStatus.LOGOUT_FAILED
                );
        }
        
        ScrapingStatusResponse response = new ScrapingStatusResponse(scrapingProgressMap, isInProgress);
        return ResponseEntity.ok(response);
    }
}