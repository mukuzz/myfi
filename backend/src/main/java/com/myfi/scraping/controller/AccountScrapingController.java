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
    
    // Removed separate /scrape/bank and /scrape/credit-card endpoints
    // @PostMapping(value = "/scrape/bank", consumes = MediaType.APPLICATION_JSON_VALUE)
    // public ResponseEntity<List<Transaction>> scrapeBankTransactions(@RequestBody List<BankCredentials> credentialsList) {
    //     return scrape(credentialsList);
    // }

    // @PostMapping(value = "/scrape/credit-card", consumes = MediaType.APPLICATION_JSON_VALUE)
    // public ResponseEntity<List<Transaction>> scrapeCreditCardTransactions(@RequestBody List<BankCredentials> credentialsList) {
    //     return scrape(credentialsList);
    // }

    // Single endpoint for scraping
    @PostMapping(value = "/scrape", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Transaction>> scrapeAccounts(
        @RequestBody @NotEmpty(message = "Credentials list cannot be empty") List<@Valid AccountCredentials> credentialsList
    ) {
        return scrape(credentialsList);
    }

    private ResponseEntity<List<Transaction>> scrape(List<AccountCredentials> credentialsList) {
        List<Transaction> allTransactions = new ArrayList<>();
        boolean hasErrors = false;

        for (AccountCredentials credentials : credentialsList) {
            Optional<Account> optionalAccount = accountService.getAccountByAccountNumber(credentials.getAccountNumber());

            if (optionalAccount.isEmpty()) {
                log.warn("Account not found for account number: {}", credentials.getAccountNumber());
                hasErrors = true; // Mark error as account wasn't found for this credential
                continue; 
            }

            Account account = optionalAccount.get();
            Account.AccountType accountType = account.getType(); // Get account type
            String accountNumberToScrape = account.getAccountNumber();
            BankScrapper bankScrapper = null;
            String determinedScrapeType = "UNKNOWN"; // For logging

            try {
                // Instantiate Scraper based on bank name
                if (credentials.getAccountName().equalsIgnoreCase("ICICI")) {
                    bankScrapper = new ICICIBankScraper(transactionService);
                } else if (credentials.getAccountName().equalsIgnoreCase("HDFC")) {
                    bankScrapper = new HDFCBankScraper(transactionService);
                } else {
                    log.error("Invalid bank name provided: {}", credentials.getAccountName());
                    hasErrors = true; 
                    continue;
                }

                log.info("Attempting login for account number: {}", accountNumberToScrape);
                bankScrapper.login(credentials);

                List<Transaction> res = Collections.emptyList();

                // Determine scraping action based on AccountType
                if (accountType == Account.AccountType.SAVINGS) { // Assuming SAVINGS is the primary bank type
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
                    // Handle other account types if necessary, e.g., log a warning or skip
                    log.warn("Unsupported account type ({}) for scraping account number: {}. Skipping.", accountType, accountNumberToScrape);
                    // Optionally mark as error or just skip
                    // hasErrors = true; 
                    // Continue without adding transactions, effectively skipping this one for scraping.
                }
                
                allTransactions.addAll(res);

            } catch (Exception e) {
                log.error("Error during {} scraping for account number {}: {}", determinedScrapeType, accountNumberToScrape, e.getMessage(), e);
                hasErrors = true; 
            } finally {
                if (bankScrapper != null) {
                    try {
                        bankScrapper.logout();
                    } catch (Exception logoutEx) {
                        // Log error during logout, potentially using determinedScrapeType if known
                        log.error("Error during logout after {} scraping attempt for account number {}: {}", determinedScrapeType, accountNumberToScrape, logoutEx.getMessage(), logoutEx);
                        hasErrors = true;
                    }
                }
            }
        }

        // Decide on the final response status based on whether any errors occurred
        if (hasErrors && allTransactions.isEmpty()) {
            // Don't update time if it completely failed for all
            return ResponseEntity.internalServerError().body(Collections.emptyList());
        } else {
            // Update timestamp on partial or full success before returning
            systemStatusService.updateLastScrapeTime(); 
            if (hasErrors) {
                 return ResponseEntity.status(207).body(allTransactions); // Multi-Status
            } else {
                return ResponseEntity.ok(allTransactions);
            }
        }
    }
}