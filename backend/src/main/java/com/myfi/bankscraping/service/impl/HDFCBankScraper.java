package com.myfi.bankscraping.service.impl;

import com.microsoft.playwright.*;
import com.microsoft.playwright.options.LoadState;
import com.myfi.bankscraping.model.AccountCredentials;
import com.myfi.bankscraping.service.BankScrapper;
import com.myfi.model.Account;
import com.myfi.model.Transaction;
import com.myfi.service.AccountHistoryService;
import com.myfi.service.TransactionService;
import com.myfi.model.Account.AccountType;
import java.util.Set;
import java.util.EnumSet;

import lombok.extern.slf4j.Slf4j;
import java.math.BigDecimal;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class HDFCBankScraper extends BankScrapper {

    private final TransactionService transactionService;
    private final AccountHistoryService accountHistoryService;

    private static final String HDFC_LOGIN_URL = "https://netbanking.hdfcbank.com/netbanking/";

    @Autowired
    public HDFCBankScraper(TransactionService transactionService, AccountHistoryService accountHistoryService) {
        super();
        this.transactionService = transactionService;
        this.accountHistoryService = accountHistoryService;
    }

    @Override
    public void scrapeBankTransactions(Account account) {
        String accountNumber = account.getAccountNumber();
        log.info("Starting savings account scraping for HDFC account number: {}", accountNumber);
        try {
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

            // Extract the current balance from the account page
            getPage().waitForSelector(".summary-heading decimal-casing");
            String balanceText = getPage().querySelector(".summary-heading decimal-casing").textContent().trim();

            // Clean up the balance text to extract just the number
            String cleanedBalanceText = balanceText.replaceAll("[^0-9.-]", "");
            BigDecimal currentBalance = new BigDecimal(cleanedBalanceText);

            log.info("Current balance for HDFC account {}: {}", account.getAccountNumber(), currentBalance);

            // Save the current balance to account history
            accountHistoryService.createAccountHistoryRecord(account.getId(), currentBalance);

            // Wait for and click the dropdown control
            getPage().waitForSelector("hdfc-dropdown[control='accountsStatementCtrl.dropdownControl']");
            getPage().click("hdfc-dropdown[control='accountsStatementCtrl.dropdownControl']");
            getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
            getPage().waitForLoadState(LoadState.NETWORKIDLE);

            // Wait for dropdown to open and click "Recent Transactions" option
            getPage().waitForSelector("#ui-select-choices-row-0-0");
            getPage().click("#ui-select-choices-row-0-0");
            getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
            getPage().waitForLoadState(LoadState.NETWORKIDLE);

            // Get all transaction rows
            getPage().waitForSelector("tbody[ng-if='accountsStatementCtrl.dataFlag.apiTableYesData']");
            while (true) {
                List<ElementHandle> rows = getPage()
                        .querySelectorAll("tbody[ng-if='accountsStatementCtrl.dataFlag.apiTableYesData'] tr");
                processBankTransactions(rows, account);
                ElementHandle nextButton = getPage().querySelector("a.btn-pagination-next");

                if (nextButton != null && nextButton.getAttribute("disabled") == null) {
                    log.info("Navigating to next page of HDFC savings transactions");
                    nextButton.click();
                    getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
                    getPage().waitForLoadState(LoadState.NETWORKIDLE);
                } else {
                    log.info("No more transaction pages found or 'Next' button is disabled.");
                    break; // Exit the loop if no next page
                }
            }

            log.info("Finished savings account scraping for HDFC account number: {}", accountNumber);
        } catch (Exception e) {
            log.error("Error during HDFC savings account scraping for account {}: {}", account.getAccountNumber(), e.getMessage(), e);
        }
    }

    private void processBankTransactions(List<ElementHandle> allRows, Account account) {
        for (ElementHandle row : allRows) {
            try {
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
            } catch (Exception e) {
                log.error("Failed to process HDFC savings transaction row. Error: {}", e.getMessage(), e);
            }
        }
    }

    @Override
    public String getBankName() {
        return "HDFC";
    }

    @Override
    public void scrapeCreditCardTransactions(Account account) {
        String cardNumber = account.getAccountNumber();
        String last4Digits = cardNumber.substring(cardNumber.length() - 4);
        log.info("Starting credit card scraping for HDFC card number ending in: {}", last4Digits);
        try {
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
            List<ElementHandle> cardRows = getPage().querySelectorAll("#goToCreditCardSection .panel-row");
            boolean cardFound = false; // Flag to track if the card was found
            for (ElementHandle row : cardRows) {
                String cardText = row.querySelector(".f4.c2").textContent().replaceAll("\\s+", "");
                if (cardText.endsWith(last4Digits)) {
                    ElementHandle arrow = row.querySelector("a.arrow");
                    if (arrow != null) {
                        arrow.click();
                        cardFound = true; // Set flag to true when card is found and clicked
                        break;
                    }
                }
            }

            // Proceed only if the card was found and clicked
            if (!cardFound) {
                log.warn("Could not find the credit card ending in {} on the page.", last4Digits);
                return;
            }

            getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
            getPage().waitForLoadState(LoadState.NETWORKIDLE);

            // Wait for the credit card summary section to load
            getPage().waitForSelector(".summary-list");

            // Extract the current outstanding amount
            try {
                // Look for the element containing the outstanding amount
                ElementHandle outstandingAmountElement = getPage().querySelector(
                        "div.smrySect1 p.f12.c1.margin-top10.margin-bottom10 decimal-casing, " +
                                "div.margin-top10.margin-bottom20 p.f12.c1.margin-top10.margin-bottom10 decimal-casing");

                if (outstandingAmountElement != null) {
                    // Extract the amount parts and combine them
                    String wholeNumber = outstandingAmountElement.querySelector("span[ng-style]:nth-child(2)").textContent()
                            .trim();
                    String decimal = outstandingAmountElement
                            .querySelector("span[ng-style='{\\'font-size\\': \\'16px\\'}']").textContent().trim();

                    // Remove commas and combine the parts
                    String amountStr = wholeNumber.replaceAll(",", "") + decimal;
                    BigDecimal outstandingAmount = new BigDecimal(amountStr);

                    // Save the current balance to account history (as negative value since it's
                    // credit card debt)
                    accountHistoryService.createAccountHistoryRecord(account.getId(), outstandingAmount.negate());

                    log.info("Current outstanding amount for HDFC credit card {}: {}",
                            account.getAccountNumber().substring(account.getAccountNumber().length() - 4),
                            outstandingAmount);
                } else {
                    log.warn("Could not find outstanding amount element on the page");
                }
            } catch (Exception e) {
                log.error("Error extracting HDFC credit card outstanding amount for card ending in {}: {}", last4Digits, e.getMessage(), e);
            }

            try {
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
            } catch (Exception e) {
                log.error("Error scraping HDFC credit card transactions for card ending in {}: {}", last4Digits, e.getMessage(), e);
            }

            log.info("Finished credit card scraping for HDFC card number ending in: {}.", last4Digits);
        } catch (Exception e) {
            log.error("Error during HDFC credit card scraping for card ending in {}: {}", last4Digits, e.getMessage(), e);
        }
    }

    private void processCreditCardTransactions(Account account, List<ElementHandle> rows) {
        for (ElementHandle row : rows) {
            try {
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
                // Note: HDFC unbilled doesn't seem to explicitly mark Dr/Cr, assuming all are DEBIT (purchases)
                // This might need adjustment based on actual data if credits can appear here.
                Transaction.TransactionType type = Transaction.TransactionType.DEBIT;

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
            } catch (Exception e) {
                log.error("Failed to process HDFC credit card transaction row. Error: {}", e.getMessage(), e);
            }
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
        try {
            log.info("Attempting HDFC logout.");
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
            try {
                getPage().screenshot(new Page.ScreenshotOptions()
                        .setPath(Paths.get("storage/hdfc-logout-" + System.currentTimeMillis() + ".png"))
                        .setFullPage(true));
            } catch (Exception screenshotEx) {
                log.warn("Failed to take HDFC logout screenshot: {}", screenshotEx.getMessage());
            }
            log.info("HDFC logout successful.");

        } catch (Exception e) {
            log.error("Error during HDFC logout: {}", e.getMessage(), e);
            // Logout failed, but still attempt to close the page resources
        } finally {
            // Close the browser page
            closePage();
            log.info("HDFC browser page closed.");
        }
    }

    @Override
    public Set<AccountType> getSupportedAccountTypes() {
        // HDFC scraper implements both bank and credit card scraping
        return EnumSet.of(AccountType.SAVINGS, AccountType.CREDIT_CARD);
    }
}