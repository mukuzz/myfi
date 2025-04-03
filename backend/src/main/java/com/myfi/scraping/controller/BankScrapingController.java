package com.myfi.scraping.controller;

import com.myfi.scraping.model.BankCredentials;
import com.myfi.model.Transaction;
import com.myfi.scraping.service.BankScrapper;
import com.myfi.scraping.service.impl.ICICIBankScraper;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/scraping")
public class BankScrapingController {

    @PostMapping(value = "/scrape", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Transaction>> scrapeTransactions(@RequestBody BankCredentials credentials) {
        BankScrapper bankScrapper = new ICICIBankScraper();
        bankScrapper.login(credentials);
        List<Transaction> res = bankScrapper.scrapeSavingsAccountTransactions("1234567890");
        bankScrapper.logout();
        return ResponseEntity.ok(res);
    }
}