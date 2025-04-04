package com.myfi.scraping.controller;

import com.myfi.model.Account;
import com.myfi.scraping.model.BankCredentials;
import com.myfi.model.Transaction;
import com.myfi.scraping.service.BankScrapper;
import com.myfi.scraping.service.impl.HDFCBankScraper;
import com.myfi.scraping.service.impl.ICICIBankScraper;
import com.myfi.service.AccountService;
import com.myfi.service.TransactionService;

import lombok.extern.slf4j.Slf4j;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/scraping")
public class AccountScrapingController {

    @Autowired
    private AccountService accountService;
    @Autowired
    private TransactionService transactionService;
    
    @PostMapping(value = "/scrape/bank", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Transaction>> scrapeBankTransactions(@RequestBody BankCredentials credentials) {
        return scrape(credentials, ScrapeType.BANK);
    }

    @PostMapping(value = "/scrape/credit-card", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Transaction>> scrapeCreditCardTransactions(@RequestBody BankCredentials credentials) {
        return scrape(credentials, ScrapeType.CREDIT_CARD);
    }

    private ResponseEntity<List<Transaction>> scrape(BankCredentials credentials, ScrapeType scrapeType) {
        Optional<Account> optionalAccount = accountService.getAccountByAccountNumber(credentials.getAccountNumber());

        if (optionalAccount.isEmpty()) {
            log.warn("Account not found for account number: {}", credentials.getAccountNumber());
            return ResponseEntity.notFound().build();
        }

        Account account = optionalAccount.get();
        String accountNumberToScrape = account.getAccountNumber();

        BankScrapper bankScrapper;
        if (credentials.getBankName().equalsIgnoreCase("ICICI")) {
            bankScrapper = new ICICIBankScraper(transactionService);
        } else if (credentials.getBankName().equalsIgnoreCase("HDFC")) {
            bankScrapper = new HDFCBankScraper(transactionService);
        } else {
            log.error("Invalid bank name provided: {}", credentials.getBankName());
            return ResponseEntity.badRequest().body(Collections.emptyList());
        }

        try {
            log.info("Attempting login for account number: {}", accountNumberToScrape);
            bankScrapper.login(credentials);

            List<Transaction> res;
            if (scrapeType == ScrapeType.BANK) {
                log.info("Scraping BANK transactions for account number: {}", accountNumberToScrape);
                res = bankScrapper.scrapeBankTransactions(account);
                log.info("BANK scraping successful for account number: {}. Found {} transactions.", accountNumberToScrape, res.size());
            } else {
                log.info("Scraping CREDIT CARD transactions for account number: {}", accountNumberToScrape);
                res = bankScrapper.scrapeCreditCardTransactions(account);
                log.info("CREDIT CARD scraping successful for account number: {}. Found {} transactions.", accountNumberToScrape, res.size());
            }

            bankScrapper.logout();
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            log.error("Error during {} scraping for account number {}: {}", scrapeType, accountNumberToScrape, e.getMessage(), e);
            try {
                bankScrapper.logout();
            } catch (Exception logoutEx) {
                log.error("Error during logout after {} scraping failure for account number {}: {}", scrapeType, accountNumberToScrape, logoutEx.getMessage(), logoutEx);
            }
            return ResponseEntity.internalServerError().body(Collections.emptyList());
        }
    }

    private enum ScrapeType {
        BANK, CREDIT_CARD
    }
}