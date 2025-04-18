package com.myfi.scraping.controller;

import com.myfi.model.Account;
import com.myfi.scraping.model.AccountCredentials;
import com.myfi.scraping.service.BankScrapper;
import com.myfi.scraping.service.impl.HDFCBankScraper;
import com.myfi.scraping.service.impl.ICICIBankScraper;
import com.myfi.service.AccountService;
import com.myfi.service.TransactionService;
import com.myfi.service.SystemStatusService;

import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.Callable;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
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
    private TransactionService transactionService;
    @Autowired
    private SystemStatusService systemStatusService;

    @Autowired
    private ICICIBankScraper iciciBankScraper;

    @Autowired
    private HDFCBankScraper hdfcBankScraper;

    // Map to hold Semaphores for each bank type, limiting concurrency to 1 per type
    private final ConcurrentHashMap<String, Semaphore> bankSemaphores = new ConcurrentHashMap<>();

    // Single endpoint for scraping
    @PostMapping(value = "/scrape", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> scrapeAccounts(
        @RequestBody @NotEmpty(message = "Credentials list cannot be empty") List<@Valid AccountCredentials> credentialsList
    ) {
        return scrape(credentialsList);
    }

    private ResponseEntity<Void> scrape(List<AccountCredentials> credentialsList) {
        AtomicBoolean hasErrors = new AtomicBoolean(false);
        int poolSize = Math.min(credentialsList.size(), 4); // Limit pool size to 4 or less if fewer credentials
        ExecutorService executor = Executors.newFixedThreadPool(poolSize > 0 ? poolSize : 1); // Ensure pool size is at least 1
        List<Future<Void>> futures = new ArrayList<>();

        log.info("Starting parallel scraping for {} accounts with pool size {}", credentialsList.size(), poolSize);

        for (AccountCredentials credentials : credentialsList) {
            Callable<Void> task = () -> {
                Optional<Account> optionalAccount = accountService.getAccountByAccountNumber(credentials.getAccountNumber());

                if (optionalAccount.isEmpty()) {
                    log.warn("Account not found for account number: {}", credentials.getAccountNumber());
                    hasErrors.set(true); // Mark error as account wasn't found
                    return null; // Return null for this task
                }

                Account account = optionalAccount.get();
                Account.AccountType accountType = account.getType(); // Get account type
                String accountNumberToScrape = account.getAccountNumber();
                BankScrapper bankScrapper = null;
                String determinedScrapeType = "UNKNOWN"; // For logging
                boolean taskError = false; // Track error within this task
                String bankName = account.getName().toUpperCase(); // Use uppercase for consistency in map keys
                Semaphore bankSemaphore = bankSemaphores.computeIfAbsent(bankName, k -> new Semaphore(1)); // Get or create semaphore for this bank

                try {
                    log.info("Attempting to acquire permit for bank: {}", bankName);
                    bankSemaphore.acquire(); // Wait for permit for this specific bank type
                    log.info("Permit acquired for bank: {}. Proceeding with scraping for account: {}", bankName, accountNumberToScrape);

                    // Instantiate Scraper based on bank name
                    if (credentials.getAccountName().equalsIgnoreCase("ICICI")) {
                        bankScrapper = iciciBankScraper;
                    } else if (credentials.getAccountName().equalsIgnoreCase("HDFC")) {
                        bankScrapper = hdfcBankScraper;
                    } else {
                        log.error("Invalid bank name provided: {}", credentials.getAccountName());
                        taskError = true;
                        return null; // Cannot proceed without a scraper
                    }

                    log.info("Attempting login for account number: {}", accountNumberToScrape);
                    bankScrapper.login(credentials);

                    // Determine scraping action based on AccountType
                    if (accountType == Account.AccountType.SAVINGS) {
                        determinedScrapeType = "BANK";
                        log.info("Scraping BANK transactions for account number: {} (Type: {})", accountNumberToScrape, accountType);
                        bankScrapper.scrapeBankTransactions(account);
                        log.info("BANK scraping successful for account number: {}", accountNumberToScrape);
                    } else if (accountType == Account.AccountType.CREDIT_CARD) {
                        determinedScrapeType = "CREDIT_CARD";
                        log.info("Scraping CREDIT CARD transactions for account number: {} (Type: {})", accountNumberToScrape, accountType);
                        bankScrapper.scrapeCreditCardTransactions(account);
                        log.info("CREDIT CARD scraping successful for account number: {}", accountNumberToScrape);
                    } else {
                        log.warn("Unsupported account type ({}) for scraping account number: {}. Skipping.", accountType, accountNumberToScrape);
                        // Skipping is not an error in itself
                    }
                    
                    return null; // Return null as we don't need to return any data

                } catch (InterruptedException ie) {
                     Thread.currentThread().interrupt();
                     log.error("Semaphore acquisition interrupted for bank {} account {}: {}", bankName, accountNumberToScrape, ie.getMessage(), ie);
                     taskError = true;
                     return null;
                } catch (Exception e) {
                    log.error("Error during {} scraping for account number {}: {}", determinedScrapeType, accountNumberToScrape, e.getMessage(), e);
                    taskError = true;
                    return null; // Return null on error
                } finally {
                    if (bankScrapper != null) {
                        try {
                            bankScrapper.logout();
                        } catch (Exception logoutEx) {
                            log.error("Error during logout after {} scraping attempt for account number {}: {}", determinedScrapeType, accountNumberToScrape, logoutEx.getMessage(), logoutEx);
                            taskError = true; // Logout error is also an error
                        }
                    }
                    if (taskError) {
                        hasErrors.set(true); // Set the global error flag if this task encountered any error
                    }
                    log.debug("Attempting to release permit for bank: {} (Account: {})", bankName, accountNumberToScrape);
                    bankSemaphore.release(); // Release the permit for this bank type
                    log.info("Permit released for bank: {}. (Account: {})", bankName, accountNumberToScrape);
                }
            };
            futures.add(executor.submit(task));
        }

        // Wait for all tasks to complete
        for (Future<Void> future : futures) {
            try {
                future.get(); // This waits for the task to complete
                // If a task threw an exception caught by Callable, it returns null + sets hasErrors.
                // If future.get() throws ExecutionException, it means an uncaught exception occurred in the task.
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("Scraping task interrupted: {}", e.getMessage(), e);
                hasErrors.set(true);
            } catch (ExecutionException e) {
                // Log the cause of the execution exception if available
                 Throwable cause = e.getCause();
                 log.error("Error executing scraping task: {}", cause != null ? cause.getMessage() : e.getMessage(), cause != null ? cause : e);
                 hasErrors.set(true); // Mark as error if task execution failed
            }
        }

        // Shutdown the executor service
        executor.shutdown();
        try {
            // Wait a reasonable amount of time for tasks to finish execution
            if (!executor.awaitTermination(15, TimeUnit.MINUTES)) {
                 log.warn("Executor did not terminate in the specified time (15 minutes).");
                 List<Runnable> droppedTasks = executor.shutdownNow();
                 log.warn("Executor was abruptly shut down. {} tasks may not have completed.", droppedTasks.size());
                 // Consider marking error if tasks were dropped
                 if (!droppedTasks.isEmpty()) {
                     hasErrors.set(true);
                 }
            }
            log.info("Executor terminated successfully.");
        } catch (InterruptedException e) {
             log.warn("Executor shutdown sequence interrupted.");
             executor.shutdownNow();
             Thread.currentThread().interrupt();
             hasErrors.set(true); // Interruption during shutdown might indicate issues
        }

        log.info("Parallel scraping finished. Errors occurred: {}", hasErrors.get());

        // Decide on the final response status based on whether any errors occurred
        if (hasErrors.get()) {
            // Don't update time if it completely failed for all
            log.warn("Scraping failed for all accounts.");
            return ResponseEntity.internalServerError().build();
        } else {
            // Update timestamp on success before returning
            systemStatusService.updateLastScrapeTime(); 
            log.info("Scraping completed successfully for all provided accounts.");
            return ResponseEntity.ok().build(); // Return empty response with OK status
        }
    }
}