package com.myfi.scraping.service.impl;

import com.microsoft.playwright.*;
import com.microsoft.playwright.options.LoadState;
import com.myfi.model.Account;
import com.myfi.model.Transaction;
import com.myfi.scraping.model.AccountCredentials;
import com.myfi.scraping.service.BankScrapper;
import com.myfi.service.TransactionService;
import com.myfi.model.Account.AccountType;
import java.util.Set;
import java.util.EnumSet;

import lombok.extern.slf4j.Slf4j;
import java.math.BigDecimal;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class HDFCBankScraper extends BankScrapper {

    private final TransactionService transactionService;

    private static final String HDFC_LOGIN_URL = "https://netbanking.hdfcbank.com/netbanking/";

    public HDFCBankScraper(TransactionService transactionService) {
        super();
        this.transactionService = transactionService;
    }

    @Override
    public void scrapeBankTransactions(Account account) {
        String accountNumber = account.getAccountNumber();
        log.info("Starting savings account scraping for HDFC account number: {}", accountNumber);

        // // Go to Home Page
        // getPage().waitForSelector("#web");
        // getPage().click("#web");
        // getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        // getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Hover over the webSave element
        getPage().waitForSelector("#webSave");
        getPage().hover("#webSave");
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Click on Savings Accounts link using ng-mouseover attribute
        getPage().waitForSelector(
                "[ng-mouseover=\"getLinkClick($event,'/personal/save/accounts/savings-accounts')\"]");
        getPage().click("[ng-mouseover=\"getLinkClick($event,'/personal/save/accounts/savings-accounts')\"]");
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Wait for and click the account details link
        getPage().waitForSelector("div[ng-click='mainCtrl.accountDetails(item,1)'] a.arrow");
        getPage().click("div[ng-click='mainCtrl.accountDetails(item,1)'] a.arrow");
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Wait for and click the dropdown control
        getPage().waitForSelector("hdfc-dropdown[control='accountsStatementCtrl.dropdownControl']");
        getPage().click("hdfc-dropdown[control='accountsStatementCtrl.dropdownControl']");
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Wait for dropdown to open and click "Recent Transactions" option
        getPage().waitForSelector("#ui-select-choices-row-0-1");
        getPage().click("#ui-select-choices-row-0-1");
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Get all transaction rows
        getPage().waitForSelector("tbody[ng-if='accountsStatementCtrl.dataFlag.apiTableYesData']");
        List<ElementHandle> rows = getPage()
                .querySelectorAll("tbody[ng-if='accountsStatementCtrl.dataFlag.apiTableYesData'] tr");

        getPage().waitForSelector("#ui-select-choices-row-0-2");
        getPage().click("#ui-select-choices-row-0-2");
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        getPage().waitForSelector("tbody[ng-if='accountsStatementCtrl.dataFlag.apiTableYesData']");
        List<ElementHandle> secondRows = getPage()
                .querySelectorAll("tbody[ng-if='accountsStatementCtrl.dataFlag.apiTableYesData'] tr");

        List<ElementHandle> allRows = new ArrayList<>();
        allRows.addAll(rows);
        allRows.addAll(secondRows);

        processBankTransactions(allRows, account);

        log.info("Finished savings account scraping for HDFC account number: {}", accountNumber);
    }

    private void processBankTransactions(List<ElementHandle> allRows, Account account) {

        for (ElementHandle row : allRows) {
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
                    .account(account)
                    .build();

            // Save transaction to database
            transactionService.createTransaction(transaction);
        }
    }

    @Override
    public String getBankName() {
        return "HDFC";
    }

    @Override
    public void scrapeCreditCardTransactions(Account account) {
        String cardNumber = account.getAccountNumber();
        log.info("Starting credit card scraping for HDFC card number ending in: {}",
                cardNumber.substring(cardNumber.length() - 4));

        // Go to Home Page
        getPage().waitForSelector("#web");
        getPage().click("#web");
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Hover over the webSave element
        getPage().waitForSelector("#webPay");
        getPage().hover("#webPay");
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Click on Savings Accounts link using ng-mouseover attribute
        getPage().waitForSelector("[ng-mouseover=\"getLinkClick($event,'/personal/pay/cards/credit-cards')\"]");
        getPage().click("[ng-mouseover=\"getLinkClick($event,'/personal/pay/cards/credit-cards')\"]");
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Wait for and click the account details link
        // Wait for credit card section to load
        getPage().waitForSelector("#goToCreditCardSection");

        // Find and click arrow for matching card number (last 4 digits)
        String last4Digits = cardNumber.substring(cardNumber.length() - 4);
        List<ElementHandle> cardRows = getPage().querySelectorAll(".panel-row");
        for (ElementHandle row : cardRows) {
            String cardText = row.querySelector(".f4.c2").textContent().replaceAll("\\s+", "");
            if (cardText.endsWith(last4Digits)) {
                ElementHandle arrow = row.querySelector("a.arrow");
                if (arrow != null) {
                    arrow.click();
                    break;
                }
            }
        }
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Click on Unbilled Transactions section using ng-click attribute
        getPage().waitForSelector(
                "h4[ng-click='mainCtrl.showSearchBox = false; mainCtrl.hideSearchIcon = true'] .arrow-up");
        getPage().click("h4[ng-click='mainCtrl.showSearchBox = false; mainCtrl.hideSearchIcon = true'] .arrow-up");
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Get all transaction rows
        getPage().waitForSelector("ul[ng-repeat=\"transaction in mainCtrl.filteredItems.data\"]");
        List<ElementHandle> rows = getPage()
                .querySelectorAll("ul[ng-repeat=\"transaction in mainCtrl.filteredItems.data\"]");

        processCreditCardTransactions(account, rows);

        log.info("Finished credit card scraping for HDFC card number ending in: {}.",
                last4Digits);
    }

    private void processCreditCardTransactions(Account account, List<ElementHandle> rows) {
        for (ElementHandle row : rows) {
            // Extract date
            String dateStr = row.querySelector("li:nth-child(2)").textContent();
            LocalDateTime date = LocalDateTime.parse(dateStr + " 00:00",
                    DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"));

            // Extract description
            String description = row.querySelector("li.c2").textContent().trim();

            // Extract amount
            String amountStr = row.querySelector("decimal-casing").textContent()
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
                    .account(account)
                    .build();

            // Save transaction to database
            transactionService.createTransaction(transaction);
        }
    }

    @Override
    public boolean login(AccountCredentials credentials) {
        log.info("Attempting HDFC login for user: {}", credentials.getUsername());
        try {
            // Navigate to HDFC login page
            getPage().navigate(HDFC_LOGIN_URL);

            getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
            getPage().waitForLoadState(LoadState.NETWORKIDLE);
            // Handle login

            Frame frame = getPage().frame("login_page");
            getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
            getPage().waitForLoadState(LoadState.NETWORKIDLE);

            frame.waitForSelector(".form-control");
            frame.fill(".form-control", credentials.getUsername());
            frame.waitForSelector(".login-btn");
            frame.click(".login-btn");
            getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
            getPage().waitForLoadState(LoadState.NETWORKIDLE);
            getPage().screenshot(new Page.ScreenshotOptions()
                    .setPath(Paths.get("storage/hdfc-login-" + System.currentTimeMillis() + ".png"))
                    .setFullPage(true));

            getPage().waitForSelector("input[type='password']");
            getPage().fill("input[type='password']", credentials.getPassword());
            getPage().waitForSelector("input[type='checkbox']#secureAccessID");
            getPage().click("input[type='checkbox']#secureAccessID");
            getPage().screenshot(new Page.ScreenshotOptions()
                    .setPath(Paths.get("storage/hdfc-login-" + System.currentTimeMillis() + ".png"))
                    .setFullPage(true));
            getPage().click("#loginBtn");

            // Wait for navigation and handle any security questions if present
            getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
            getPage().waitForLoadState(LoadState.NETWORKIDLE);
            getPage().screenshot(new Page.ScreenshotOptions()
                    .setPath(Paths.get("storage/hdfc-login-" + System.currentTimeMillis() + ".png"))
                    .setFullPage(true));

            return true;
        } catch (Exception e) {
            log.error("Login failed for HDFC", e);
            return false;
        }
    }

    @Override
    public void logout() {
        // Wait for and click the logout button
        getPage().waitForSelector("a[ng-click='logout();']");
        getPage().click("a[ng-click='logout();']");
        // Click the confirmation button to complete logout
        getPage().waitForSelector("a.btn.btn-primary.nb-logout.yes-btn");
        getPage().click("a.btn.btn-primary.nb-logout.yes-btn");

        // Wait for logout to complete
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Take screenshot of logout page
        getPage().screenshot(new Page.ScreenshotOptions()
                .setPath(Paths.get("storage/hdfc-logout-" + System.currentTimeMillis() + ".png"))
                .setFullPage(true));

        // Close the browser page
        closePage();
    }

    @Override
    public Set<AccountType> getSupportedAccountTypes() {
        // HDFC scraper implements both bank and credit card scraping
        return EnumSet.of(AccountType.SAVINGS, AccountType.CREDIT_CARD);
    }
}