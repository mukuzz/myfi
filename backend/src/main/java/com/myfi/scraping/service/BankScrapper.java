package com.myfi.scraping.service;

import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.myfi.model.Account;
import com.myfi.scraping.model.AccountCredentials;
import com.myfi.model.Account.AccountType;

@Service
public abstract class BankScrapper {

    private Page page;

    private Playwright playwright;
    private Browser browser;
    private BrowserContext context;

    @Value("${playwright.headless}")
    private boolean headless;

    public Page getPage() {
        if (page == null) {
            playwright = Playwright.create();
            try {
                browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
                    .setHeadless(headless)
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

    public abstract void scrapeBankTransactions(Account account);
    public abstract void scrapeCreditCardTransactions(Account account);
    public abstract boolean login(AccountCredentials credentials);
    public abstract void logout();
    public abstract String getBankName();
    public abstract Set<AccountType> getSupportedAccountTypes();
}