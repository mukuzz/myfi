package com.myfi.scraping.controller;

import com.myfi.model.Account;
import com.myfi.scraping.model.AccountCredentials;
import com.myfi.model.Transaction;
import com.myfi.scraping.service.BankScrapper;
import com.myfi.scraping.service.impl.HDFCBankScraper;
import com.myfi.scraping.service.impl.ICICIBankScraper;
import com.myfi.service.AccountService;
import com.myfi.service.TransactionService;
import com.myfi.service.SystemStatusService;

import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.Callable;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.atomic.AtomicBoolean;

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

    // Single endpoint for scraping
    @PostMapping(value = "/scrape", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Transaction>> scrapeAccounts(
        @RequestBody @NotEmpty(message = "Credentials list cannot be empty") List<@Valid AccountCredentials> credentialsList
    ) {
        return scrape(credentialsList);
    }

    private ResponseEntity<List<Transaction>> scrape(List<AccountCredentials> credentialsList) {
        List<Transaction> allTransactions = Collections.synchronizedList(new ArrayList<>());
        AtomicBoolean hasErrors = new AtomicBoolean(false);
        int poolSize = Math.min(credentialsList.size(), 4); // Limit pool size to 4 or less if fewer credentials
        ExecutorService executor = Executors.newFixedThreadPool(poolSize > 0 ? poolSize : 1); // Ensure pool size is at least 1
        List<Future<List<Transaction>>> futures = new ArrayList<>();

        log.info("Starting parallel scraping for {} accounts with pool size {}", credentialsList.size(), poolSize);

        for (AccountCredentials credentials : credentialsList) {
            Callable<List<Transaction>> task = () -> {
                Optional<Account> optionalAccount = accountService.getAccountByAccountNumber(credentials.getAccountNumber());

                if (optionalAccount.isEmpty()) {
                    log.warn("Account not found for account number: {}", credentials.getAccountNumber());
                    hasErrors.set(true); // Mark error as account wasn't found
                    return Collections.emptyList(); // Return empty list for this task
                }

                Account account = optionalAccount.get();
                Account.AccountType accountType = account.getType(); // Get account type
                String accountNumberToScrape = account.getAccountNumber();
                BankScrapper bankScrapper = null;
                String determinedScrapeType = "UNKNOWN"; // For logging
                boolean taskError = false; // Track error within this task

                try {
                    // Instantiate Scraper based on bank name
                    if (credentials.getAccountName().equalsIgnoreCase("ICICI")) {
                        bankScrapper = new ICICIBankScraper(transactionService);
                    } else if (credentials.getAccountName().equalsIgnoreCase("HDFC")) {
                        bankScrapper = new HDFCBankScraper(transactionService);
                    } else {
                        log.error("Invalid bank name provided: {}", credentials.getAccountName());
                        taskError = true;
                        return Collections.emptyList(); // Cannot proceed without a scraper
                    }

                    log.info("Attempting login for account number: {}", accountNumberToScrape);
                    bankScrapper.login(credentials);

                    List<Transaction> res = Collections.emptyList();

                    // Determine scraping action based on AccountType
                    if (accountType == Account.AccountType.SAVINGS) {
                        determinedScrapeType = "BANK";
                        log.info("Scraping BANK transactions for account number: {} (Type: {})", accountNumberToScrape, accountType);
                        res = bankScrapper.scrapeBankTransactions(account);
                        log.info("BANK scraping successful for account number: {}. Found {} transactions.", accountNumberToScrape, res.size());
                    } else if (accountType == Account.AccountType.CREDIT_CARD) {
                        determinedScrapeType = "CREDIT_CARD";
                        log.info("Scraping CREDIT CARD transactions for account number: {} (Type: {})", accountNumberToScrape, accountType);
                        res = bankScrapper.scrapeCreditCardTransactions(account);
                        log.info("CREDIT CARD scraping successful for account number: {}. Found {} transactions.", accountNumberToScrape, res.size());
                    } else {
                        log.warn("Unsupported account type ({}) for scraping account number: {}. Skipping.", accountType, accountNumberToScrape);
                        // Skipping is not an error in itself
                    }
                    
                    return res; // Return transactions scraped by this task

                } catch (Exception e) {
                    log.error("Error during {} scraping for account number {}: {}", determinedScrapeType, accountNumberToScrape, e.getMessage(), e);
                    taskError = true; 
                    return Collections.emptyList(); // Return empty on error
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
                }
            };
            futures.add(executor.submit(task));
        }

        // Wait for all tasks to complete and collect results
        for (Future<List<Transaction>> future : futures) {
            try {
                List<Transaction> result = future.get(); // This waits for the task to complete
                if (result != null) {
                     allTransactions.addAll(result);
                }
                 // If a task threw an exception caught by Callable, it returns empty list + sets hasErrors.
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

        log.info("Parallel scraping finished. Total transactions retrieved: {}. Errors occurred: {}", allTransactions.size(), hasErrors.get());

        // Decide on the final response status based on whether any errors occurred
        if (hasErrors.get() && allTransactions.isEmpty()) {
            // Don't update time if it completely failed for all
            log.warn("Scraping failed for all accounts.");
            return ResponseEntity.internalServerError().body(Collections.emptyList());
        } else {
            // Update timestamp on partial or full success before returning
            systemStatusService.updateLastScrapeTime(); 
            if (hasErrors.get()) {
                 log.warn("Scraping completed with some errors.");
                 // Return 207 Multi-Status indicating partial success
                 return ResponseEntity.status(207).body(new ArrayList<>(allTransactions)); // Return a mutable copy
            } else {
                 log.info("Scraping completed successfully for all provided accounts.");
                 return ResponseEntity.ok(new ArrayList<>(allTransactions)); // Return a mutable copy
            }
        }
    }
}