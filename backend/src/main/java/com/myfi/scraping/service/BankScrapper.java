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

    private Page page;

    private Playwright playwright;
    private Browser browser;
    private BrowserContext context;

    public Page getPage() {
        if (page == null) {
            playwright = Playwright.create();
            try {
                browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
                    .setHeadless(false)
                    .setTimeout(120000)); // 2 minutes timeout
                context = browser.newContext();
                this.page = context.newPage();
            } catch (Exception e) {
                throw new RuntimeException("Error initializing browser", e);
            }
        }
        return page;
    }

    public void closePage() {
        if (page != null) {
            page.close();
            page = null;
            
            if (context != null) {
                context.close();
                context = null;
            }
            
            if (browser != null) {
                browser.close();
                browser = null;
            }
            
            if (playwright != null) {
                playwright.close();
                playwright = null;
            }
        }
    }

    public abstract List<Transaction> scrapeBankTransactions(Account account);
    public abstract List<Transaction> scrapeCreditCardTransactions(Account account);
    public abstract boolean login(AccountCredentials credentials);
    public abstract void logout();
    public abstract String getBankName();
    public abstract Set<AccountType> getSupportedAccountTypes();
}