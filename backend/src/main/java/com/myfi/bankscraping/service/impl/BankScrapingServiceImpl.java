package com.myfi.bankscraping.service.impl;

import com.myfi.bankscraping.model.AccountCredentials;
import com.myfi.bankscraping.service.BankScrapper;
import com.myfi.bankscraping.service.BankScrapingService;
import com.myfi.model.Account;
import com.myfi.refresh.dto.RefreshOperationProgress;
import com.myfi.refresh.enums.RefreshJobStatus;
import com.myfi.refresh.enums.RefreshType;
import com.myfi.refresh.service.RefreshTrackingService;
import com.myfi.service.AccountService;
import com.myfi.service.SystemStatusService;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
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

    @Autowired
    private RefreshTrackingService refreshTrackingService;

    private final ConcurrentHashMap<String, Semaphore> bankSemaphores = new ConcurrentHashMap<>();

    @Override
    public void submitScrapingTasks(List<AccountCredentials> credentialsList) {
        log.debug("Received request to submit scraping tasks for {} accounts.", credentialsList.size());
        refreshTrackingService.clearProgressForType(RefreshType.BANK_SCRAPING);
        for (AccountCredentials creds : credentialsList) {
            refreshTrackingService.initializeOperation(
                    RefreshType.BANK_SCRAPING,
                    creds.getAccountNumber(),
                    creds.getAccountName(),
                    Optional.empty()
            );
        }
        for (AccountCredentials creds : credentialsList) {
            Callable<Void> task = () -> {
                scrapingTask(creds);
                return null;
            };
            executor.submit(task);
        }
        log.info("Finished submitting all scraping tasks.");
    }

    private void scrapingTask(AccountCredentials credentials) {
        final String accountNumberToScrape = credentials.getAccountNumber();
        boolean taskError = false;
        String bankName = "UNKNOWN";
        Semaphore bankSemaphore = null;
        boolean loginSuccess = false;
        String determinedScrapeType = "UNKNOWN";
        RefreshJobStatus currentLogicStatus = RefreshJobStatus.PENDING;

        Optional<Account> optionalAccount = accountService.getAccountByAccountNumber(accountNumberToScrape);

        if (optionalAccount.isEmpty()) {
            log.warn("Account not found for account number: {}", accountNumberToScrape);
            refreshTrackingService.failOperation(RefreshType.BANK_SCRAPING, accountNumberToScrape, "Account not found in DB");
            return;
        }

        Account account = optionalAccount.get();
        bankName = account.getName().toUpperCase();

        refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.ACQUIRING_PERMIT, "Attempting to acquire bank permit.");
        currentLogicStatus = RefreshJobStatus.ACQUIRING_PERMIT;
        bankSemaphore = bankSemaphores.computeIfAbsent(bankName, k -> new Semaphore(1));
        BankScrapper bankScrapper = null;

        try {
            log.info("Attempting to acquire permit for bank: {}", bankName);
            bankSemaphore.acquire();
            log.info("Permit acquired for bank: {}. Proceeding with scraping for account: {}", bankName, accountNumberToScrape);

            if (credentials.getAccountName().equalsIgnoreCase("ICICI")) {
                bankScrapper = iciciBankScraper;
            } else if (credentials.getAccountName().equalsIgnoreCase("HDFC")) {
                bankScrapper = hdfcBankScraper;
            } else {
                log.error("Invalid bank name provided in credentials: {}", credentials.getAccountName());
                refreshTrackingService.failOperation(RefreshType.BANK_SCRAPING, accountNumberToScrape, "Invalid bank name in credentials: " + credentials.getAccountName());
                taskError = true;
            }

            if (!taskError) {
                refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.LOGIN_STARTED, "Login process started.");
                currentLogicStatus = RefreshJobStatus.LOGIN_STARTED;
                loginSuccess = bankScrapper.login(credentials);

                if (!loginSuccess) {
                    refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.LOGIN_FAILED, "Login attempt failed");
                    currentLogicStatus = RefreshJobStatus.LOGIN_FAILED;
                    taskError = true;
                } else {
                    refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.LOGIN_SUCCESS, "Login successful.");
                    currentLogicStatus = RefreshJobStatus.LOGIN_SUCCESS;
                    refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.PROCESSING_STARTED, "Scraping process started.");
                    currentLogicStatus = RefreshJobStatus.PROCESSING_STARTED;
                    Account.AccountType accountType = account.getType();

                    if (accountType == Account.AccountType.SAVINGS) {
                        determinedScrapeType = "BANK";
                        refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.BANK_PROCESSING_STARTED, "Scraping bank transactions.");
                        currentLogicStatus = RefreshJobStatus.BANK_PROCESSING_STARTED;
                        bankScrapper.scrapeBankTransactions(account);
                        refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.PROCESSING_SUCCESS, "Bank transactions scraped successfully.");
                        currentLogicStatus = RefreshJobStatus.PROCESSING_SUCCESS;
                    } else if (accountType == Account.AccountType.CREDIT_CARD) {
                        determinedScrapeType = "CREDIT_CARD";
                        refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.CC_PROCESSING_STARTED, "Scraping credit card transactions.");
                        currentLogicStatus = RefreshJobStatus.CC_PROCESSING_STARTED;
                        bankScrapper.scrapeCreditCardTransactions(account);
                        refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.PROCESSING_SUCCESS, "Credit card transactions scraped successfully.");
                        currentLogicStatus = RefreshJobStatus.PROCESSING_SUCCESS;
                    } else {
                        refreshTrackingService.completeOperationSuccessfully(RefreshType.BANK_SCRAPING, accountNumberToScrape, "Unsupported account type, no action taken.");
                        currentLogicStatus = RefreshJobStatus.COMPLETED;
                    }
                }
            }
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            refreshTrackingService.failOperation(RefreshType.BANK_SCRAPING, accountNumberToScrape, "Interrupted while waiting for permit: " + ie.getMessage());
            taskError = true; currentLogicStatus = RefreshJobStatus.ERROR;
        } catch (Exception e) {
            refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.PROCESSING_FAILED, "Error during " + determinedScrapeType + " scraping: " + e.getMessage());
            taskError = true; currentLogicStatus = RefreshJobStatus.PROCESSING_FAILED;
        } finally {
            if (bankScrapper != null) {
                try {
                    if (loginSuccess) {
                        refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.LOGOUT_STARTED, "Logout process started.");
                        currentLogicStatus = RefreshJobStatus.LOGOUT_STARTED;
                        bankScrapper.logout();
                        refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.LOGOUT_SUCCESS, "Logout successful.");
                        currentLogicStatus = RefreshJobStatus.LOGOUT_SUCCESS;
                    }
                } catch (Exception logoutEx) {
                    refreshTrackingService.updateOperationState(RefreshType.BANK_SCRAPING, accountNumberToScrape, RefreshJobStatus.LOGOUT_FAILED, "Logout error: " + logoutEx.getMessage());
                    taskError = true; currentLogicStatus = RefreshJobStatus.LOGOUT_FAILED;
                } finally {
                    bankScrapper.closePage();
                }
            }

            RefreshJobStatus reportedStatus = refreshTrackingService.getProgressForOperation(RefreshType.BANK_SCRAPING, accountNumberToScrape)
                                                 .map(RefreshOperationProgress::getStatus)
                                                 .orElse(RefreshJobStatus.ERROR);

            if (taskError) {
                 if (reportedStatus != RefreshJobStatus.LOGIN_FAILED && 
                     reportedStatus != RefreshJobStatus.PROCESSING_FAILED && 
                     reportedStatus != RefreshJobStatus.LOGOUT_FAILED && 
                     reportedStatus != RefreshJobStatus.ERROR) {
                    refreshTrackingService.failOperation(RefreshType.BANK_SCRAPING, accountNumberToScrape, "Task completed with errors. Last internal state: " + currentLogicStatus + ". Reported: " + reportedStatus);
                }
            } else if (reportedStatus == RefreshJobStatus.PROCESSING_SUCCESS || reportedStatus == RefreshJobStatus.LOGOUT_SUCCESS || reportedStatus == RefreshJobStatus.COMPLETED) {
                if (reportedStatus != RefreshJobStatus.COMPLETED) { 
                   refreshTrackingService.completeOperationSuccessfully(RefreshType.BANK_SCRAPING, accountNumberToScrape, "Task completed successfully.");
                }
                if(reportedStatus == RefreshJobStatus.PROCESSING_SUCCESS || reportedStatus == RefreshJobStatus.LOGOUT_SUCCESS) {
                    systemStatusService.updateLastScrapeTime(); 
                }
            } else if (!isTerminalRefreshJobStatus(reportedStatus)) {
                log.warn("Task for account {} finished in unexpected non-terminal state: {}. Marking as ERROR.", accountNumberToScrape, reportedStatus);
                refreshTrackingService.failOperation(RefreshType.BANK_SCRAPING, accountNumberToScrape, "Task finished in unexpected state: " + reportedStatus);
            }

            if (bankSemaphore != null) {
                bankSemaphore.release();
                log.info("Permit released for bank: {}. (Account: {})", bankName, accountNumberToScrape);
            }
        }
    }
    
    private boolean isTerminalRefreshJobStatus(RefreshJobStatus status) {
        return status == RefreshJobStatus.COMPLETED || 
               status == RefreshJobStatus.ERROR ||
               status == RefreshJobStatus.LOGIN_FAILED ||
               status == RefreshJobStatus.PROCESSING_FAILED ||
               status == RefreshJobStatus.LOGOUT_FAILED;
    }
}