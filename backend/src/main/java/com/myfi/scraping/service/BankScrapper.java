package com.myfi.scraping.service;

import java.util.List;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.myfi.model.Transaction;
import com.myfi.scraping.model.BankCredentials;

public abstract class BankScrapper {

    public Page page;

    public BankScrapper() {
        Playwright playwright = Playwright.create();
        try {
            Browser browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
            .setHeadless(false));
            BrowserContext context = browser.newContext();
            this.page = context.newPage();
        } catch (Exception e) {
            throw new RuntimeException("Error initializing browser", e);
        }
    }

    public abstract List<Transaction> scrapeSavingsAccountTransactions(String accountNumber);
    public abstract List<Transaction> scrapeCreditCardTransactions(String cardNumber);
    public abstract boolean login(BankCredentials credentials);
    public abstract void logout();
    public abstract String getBankName();
}