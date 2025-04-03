package com.myfi.scraping.service.impl;

import com.microsoft.playwright.*;
import com.microsoft.playwright.options.LoadState;
import com.myfi.model.Transaction;
import com.myfi.scraping.model.BankCredentials;
import com.myfi.scraping.service.BankScrapper;
import lombok.extern.slf4j.Slf4j;
import java.math.BigDecimal;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
public class HDFCBankScraper extends BankScrapper {

    private static final String HDFC_LOGIN_URL = "https://netbanking.hdfcbank.com/netbanking/";

    public HDFCBankScraper() {
        super();
    }

    @Override
    public List<Transaction> scrapeSavingsAccountTransactions(String accountNumber) {

        // Go to Home Page
        page.waitForSelector("#web");
        page.click("#web");
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);

        // Hover over the webSave element
        page.waitForSelector("#webSave");
        page.hover("#webSave");
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);

        // Click on Savings Accounts link using ng-mouseover attribute
        page.waitForSelector("[ng-mouseover=\"getLinkClick($event,'/personal/save/accounts/savings-accounts')\"]");
        page.click("[ng-mouseover=\"getLinkClick($event,'/personal/save/accounts/savings-accounts')\"]");
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);

        // Wait for and click the account details link
        page.waitForSelector("div[ng-click='mainCtrl.accountDetails(item,1)'] a.arrow");
        page.click("div[ng-click='mainCtrl.accountDetails(item,1)'] a.arrow");
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);

        // Wait for and click the dropdown control
        page.waitForSelector("hdfc-dropdown[control='accountsStatementCtrl.dropdownControl']");
        page.click("hdfc-dropdown[control='accountsStatementCtrl.dropdownControl']");
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);

        // Wait for dropdown to open and click "Recent Transactions" option
        page.waitForSelector("#ui-select-choices-row-0-0");
        page.click("#ui-select-choices-row-0-0");
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);

        // Extract transaction details from the table
        List<Transaction> transactions = new ArrayList<>();

        // Get all transaction rows
        page.waitForSelector("tbody[ng-if='accountsStatementCtrl.dataFlag.apiTableYesData']");
        List<ElementHandle> rows = page
                .querySelectorAll("tbody[ng-if='accountsStatementCtrl.dataFlag.apiTableYesData'] tr");

        for (ElementHandle row : rows) {
            // Extract date
            String dateStr = row.querySelector(".hidden-xs.f4.c1").textContent();
            LocalDateTime date = LocalDateTime.parse(dateStr + " 00:00",
                    DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"));

            // Extract description and reference number
            String description = row.querySelector(".hidden-xs.f4.c1:nth-child(3)").textContent();

            // Extract amount
            String amountStr = row.querySelector(".f9.c1").textContent()
                    .replaceAll("[^0-9.]", ""); // Remove all non-numeric chars except decimal
            BigDecimal amount = new BigDecimal(amountStr);

            // Determine transaction type (DEBIT/CREDIT)
            boolean isDebit = row.querySelector(".debit") != null;
            Transaction.TransactionType type = isDebit ? Transaction.TransactionType.DEBIT
                    : Transaction.TransactionType.CREDIT;

            // Create transaction object
            Transaction transaction = Transaction.builder()
                    .amount(amount)
                    .description(description)
                    .type(type)
                    .transactionDate(date)
                    .createdAt(LocalDateTime.now())
                    .build();

            transactions.add(transaction);
        }

        return transactions;
    }

    @Override
    public String getBankName() {
        return "HDFC";
    }

    @Override
    public List<Transaction> scrapeCreditCardTransactions(String cardNumber) {
        throw new UnsupportedOperationException("Unimplemented method 'scrapeCreditCardTransactions'");
    }

    @Override
    public boolean login(BankCredentials credentials) {
        // Navigate to HDFC login page
        page.navigate(HDFC_LOGIN_URL);

        page.waitForLoadState(LoadState.LOAD);
        // Handle login

        Frame frame = page.frame("login_page");
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);

        frame.waitForSelector(".form-control");
        frame.fill(".form-control", credentials.getUsername());
        frame.waitForSelector(".login-btn");
        frame.click(".login-btn");
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);
        page.screenshot(new Page.ScreenshotOptions()
                .setPath(Paths.get("storage/hdfc-login-" + System.currentTimeMillis() + ".png"))
                .setFullPage(true));

        page.waitForSelector("input[type='password']");
        page.fill("input[type='password']", credentials.getPassword());
        page.waitForSelector("input[type='checkbox']#secureAccessID");
        page.click("input[type='checkbox']#secureAccessID");
        page.screenshot(new Page.ScreenshotOptions()
                .setPath(Paths.get("storage/hdfc-login-" + System.currentTimeMillis() + ".png"))
                .setFullPage(true));
        page.click("#loginBtn");

        // Wait for navigation and handle any security questions if present
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);
        page.screenshot(new Page.ScreenshotOptions()
                .setPath(Paths.get("storage/hdfc-login-" + System.currentTimeMillis() + ".png"))
                .setFullPage(true));

        return true;
    }

    @Override
    public void logout() {
            // Wait for and click the logout button
            page.waitForSelector("a[ng-click='logout();']");
            page.click("a[ng-click='logout();']");
            // Click the confirmation button to complete logout
            page.waitForSelector("a.btn.btn-primary.nb-logout.yes-btn");
            page.click("a.btn.btn-primary.nb-logout.yes-btn");
            
            // Wait for logout to complete
            page.waitForLoadState(LoadState.DOMCONTENTLOADED);
            page.waitForLoadState(LoadState.NETWORKIDLE);
            
            // Take screenshot of logout page
            page.screenshot(new Page.ScreenshotOptions()
                    .setPath(Paths.get("storage/hdfc-logout-" + System.currentTimeMillis() + ".png"))
                    .setFullPage(true));
                    
            // Close the browser page
            page.close();
    }
}