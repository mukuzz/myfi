package com.myfi.bankscraping.service.impl;

import com.myfi.bankscraping.model.AccountCredentials;
import com.myfi.bankscraping.model.ScrapingProgress;
import com.myfi.bankscraping.model.ScrapingStatus;
import com.myfi.bankscraping.model.ScrapingStatusResponse;
import com.myfi.bankscraping.service.BankScrapper;
import com.myfi.bankscraping.service.BankScrapingService;
import com.myfi.model.Account;
import com.myfi.service.AccountService;
import com.myfi.service.SystemStatusService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Semaphore;

@Slf4j
@Service
public class BankScrapingServiceImpl implements BankScrapingService {

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

    @Override
    public void submitScrapingTasks(List<AccountCredentials> credentialsList) {
        log.info("Received request to submit scraping tasks for {} accounts.", credentialsList.size());

        // Clear the progress map for the new batch request
        log.info("Clearing previous scraping progress map for new batch.");
        scrapingProgressMap.clear();

        // Initialize progress map for this batch
        for (AccountCredentials creds : credentialsList) {
            scrapingProgressMap.computeIfAbsent(creds.getAccountNumber(),
                    accNum -> new ScrapingProgress(accNum, creds.getAccountName()));
        }

        log.info("Submitting scraping tasks for {} accounts.", credentialsList.size());
        for (AccountCredentials creds : credentialsList) {
            ScrapingProgress progress = scrapingProgressMap.get(creds.getAccountNumber());
            if (progress == null) {
                log.error("Progress object not found for account {} during task submission. Skipping.",
                        creds.getAccountNumber());
                continue;
            }

            Callable<Void> task = () -> {
                scrapingTask(creds, progress);
                return null;
            };

            executor.submit(task);
        }
        log.info("Finished submitting all scraping tasks.");
    }

    private void scrapingTask(AccountCredentials credentials, ScrapingProgress progress) {

        final String accountNumberToScrape = credentials.getAccountNumber();
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
            bankName = account.getName().toUpperCase(); // Use account name from DB for semaphore
            bankSemaphore = bankSemaphores.computeIfAbsent(bankName, k -> new Semaphore(1));

            try {
                log.info("Attempting to acquire permit for bank: {}", bankName);
                progress.updateStatus(ScrapingStatus.ACQUIRING_PERMIT);
                bankSemaphore.acquire();
                log.info("Permit acquired for bank: {}. Proceeding with scraping for account: {}", bankName,
                        accountNumberToScrape);

                // Use credentials' account name to determine the scraper
                if (credentials.getAccountName().equalsIgnoreCase("ICICI")) {
                    bankScrapper = iciciBankScraper;
                } else if (credentials.getAccountName().equalsIgnoreCase("HDFC")) {
                    bankScrapper = hdfcBankScraper;
                } else {
                    log.error("Invalid bank name provided in credentials: {}", credentials.getAccountName());
                    progress.updateStatusWithError(ScrapingStatus.ERROR,
                            "Invalid bank name in credentials: " + credentials.getAccountName());
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
                        log.info("Login successful for account number: {}. Proceeding with scraping.",
                                accountNumberToScrape);
                        progress.updateStatus(ScrapingStatus.LOGIN_SUCCESS);
                        progress.updateStatus(ScrapingStatus.SCRAPING_STARTED);
                        Account.AccountType accountType = account.getType();

                        if (accountType == Account.AccountType.SAVINGS) {
                            determinedScrapeType = "BANK";
                            progress.updateStatus(ScrapingStatus.SCRAPING_BANK_STARTED);
                            log.info("Scraping BANK transactions for account number: {} (Type: {})",
                                    accountNumberToScrape, accountType);
                            bankScrapper.scrapeBankTransactions(account);
                            log.info("BANK scraping successful for account number: {}", accountNumberToScrape);
                            progress.updateStatus(ScrapingStatus.SCRAPING_SUCCESS);
                        } else if (accountType == Account.AccountType.CREDIT_CARD) {
                            determinedScrapeType = "CREDIT_CARD";
                            progress.updateStatus(ScrapingStatus.SCRAPING_CC_STARTED);
                            log.info("Scraping CREDIT CARD transactions for account number: {} (Type: {})",
                                    accountNumberToScrape, accountType);
                            bankScrapper.scrapeCreditCardTransactions(account);
                            log.info("CREDIT CARD scraping successful for account number: {}", accountNumberToScrape);
                            progress.updateStatus(ScrapingStatus.SCRAPING_SUCCESS);
                        } else {
                            log.warn("Unsupported account type ({}) for scraping account number: {}. Skipping.",
                                    accountType, accountNumberToScrape);
                            // Update status to COMPLETED directly as no scraping action is taken
                            progress.updateStatus(ScrapingStatus.COMPLETED);
                        }
                    }
                }

            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                log.error("Semaphore acquisition interrupted for bank {} account {}: {}", bankName,
                        accountNumberToScrape, ie.getMessage(), ie);
                progress.updateStatusWithError(ScrapingStatus.ERROR, "Interrupted while waiting for permit");
                taskError = true;
            } catch (Exception e) {
                log.error("Error during {} scraping for account number {}: {}", determinedScrapeType,
                        accountNumberToScrape, e.getMessage(), e);
                progress.updateStatusWithError(ScrapingStatus.SCRAPING_FAILED,
                        "Error during " + determinedScrapeType + " scraping: " + e.getMessage());
                taskError = true;
            } finally {
                if (bankScrapper != null) {
                    try {
                        if (loginSuccess) {
                            log.info("Attempting logout for account: {}", accountNumberToScrape);
                            progress.updateStatus(ScrapingStatus.LOGOUT_STARTED);
                            bankScrapper.logout();
                            log.info("Logout successful for account: {}", accountNumberToScrape);
                            progress.updateStatus(ScrapingStatus.LOGOUT_SUCCESS);
                        }
                    } catch (Exception logoutEx) {
                        log.error("Error during logout after {} scraping attempt for account number {}: {}",
                                determinedScrapeType, accountNumberToScrape, logoutEx.getMessage(), logoutEx);
                        progress.updateStatusWithError(ScrapingStatus.LOGOUT_FAILED,
                                "Logout error: " + logoutEx.getMessage());
                        taskError = true;
                    } finally {
                        bankScrapper.closePage(); // Ensure page is closed regardless of logout success
                    }
                }

                // Determine final status
                if (taskError) {
                    // If an error occurred, ensure the status reflects an error state unless
                    // already set appropriately
                    if (progress.getStatus() != ScrapingStatus.LOGIN_FAILED &&
                            progress.getStatus() != ScrapingStatus.SCRAPING_FAILED &&
                            progress.getStatus() != ScrapingStatus.LOGOUT_FAILED &&
                            progress.getStatus() != ScrapingStatus.ERROR) {
                        progress.updateStatusWithError(ScrapingStatus.ERROR, "Task completed with errors");
                    }
                } else if (progress.getStatus() == ScrapingStatus.SCRAPING_SUCCESS
                        || progress.getStatus() == ScrapingStatus.LOGOUT_SUCCESS) {
                    // If scraping/logout was successful, mark as completed
                    progress.updateStatus(ScrapingStatus.COMPLETED);
                    log.info("Updating last scrape time after successful completion for account {}",
                            accountNumberToScrape);
                    systemStatusService.updateLastScrapeTime();
                } else if (progress.getStatus() != ScrapingStatus.COMPLETED) {
                    // Catch-all for unexpected non-error states not yet completed
                    log.warn("Task for account {} finished in unexpected state: {}. Marking as ERROR.",
                            accountNumberToScrape, progress.getStatus());
                    progress.updateStatusWithError(ScrapingStatus.ERROR,
                            "Task finished in unexpected state: " + progress.getStatus());
                }

                if (bankSemaphore != null) {
                    log.debug("Attempting to release permit for bank: {} (Account: {})", bankName,
                            accountNumberToScrape);
                    bankSemaphore.release();
                    log.info("Permit released for bank: {}. (Account: {})", bankName, accountNumberToScrape);
                } else {
                    log.warn("Bank semaphore was null for bank {} (Account: {}), cannot release.", bankName,
                            accountNumberToScrape);
                }
            }
        } else {
            log.debug("Skipping main try-finally block as account {} was not found.", accountNumberToScrape);
        }
    }

    @Override
    public ScrapingStatusResponse getScrapingStatus() {
        boolean isInProgress = false;
        if (!scrapingProgressMap.isEmpty()) {
            // Check if any task is not in a final state
            isInProgress = scrapingProgressMap.values().stream()
                    .anyMatch(p -> p.getStatus() != ScrapingStatus.COMPLETED &&
                            p.getStatus() != ScrapingStatus.ERROR &&
                            p.getStatus() != ScrapingStatus.LOGIN_FAILED &&
                            p.getStatus() != ScrapingStatus.SCRAPING_FAILED &&
                            p.getStatus() != ScrapingStatus.LOGOUT_FAILED);
        }

        // Create a defensive copy of the map to return
        ConcurrentHashMap<String, ScrapingProgress> progressMapCopy = new ConcurrentHashMap<>(scrapingProgressMap);

        ScrapingStatusResponse response = new ScrapingStatusResponse(progressMapCopy, isInProgress);
        log.trace("Returning scraping status: isInProgress={}, progressMapSize={}", isInProgress,
                progressMapCopy.size());
        return response;
    }
}