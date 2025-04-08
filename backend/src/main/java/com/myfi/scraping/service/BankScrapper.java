package com.myfi.scraping.service;

import java.util.List;
import java.util.Set;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.myfi.model.Account;
import com.myfi.model.Transaction;
import com.myfi.scraping.model.AccountCredentials;
import com.myfi.model.Account.AccountType;

public abstract class BankScrapper {

    public Page page;

    public BankScrapper() {
        Playwright playwright = Playwright.create();
        try {
            Browser browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
            .setHeadless(false)
            .setTimeout(120000)); // 2 minutes timeout
            BrowserContext context = browser.newContext();
            this.page = context.newPage();
        } catch (Exception e) {
            throw new RuntimeException("Error initializing browser", e);
        }
    }

    public abstract List<Transaction> scrapeBankTransactions(Account account);
    public abstract List<Transaction> scrapeCreditCardTransactions(Account account);
    public abstract boolean login(AccountCredentials credentials);
    public abstract void logout();
    public abstract String getBankName();
    public abstract Set<AccountType> getSupportedAccountTypes();
}