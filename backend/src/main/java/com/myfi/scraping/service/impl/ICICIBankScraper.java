package com.myfi.scraping.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.EnumSet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.microsoft.playwright.ElementHandle;
import com.microsoft.playwright.options.LoadState;
import com.myfi.model.Account;
import com.myfi.model.Transaction;
import com.myfi.scraping.model.AccountCredentials;
import com.myfi.scraping.service.BankScrapper;
import com.myfi.service.TransactionService;
import com.myfi.model.Account.AccountType;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class ICICIBankScraper extends BankScrapper {

    @Autowired
    private TransactionService transactionService;

    private static final String ICICI_LOGIN_URL = "https://infinity.icicibank.com/corp/AuthenticationController?FORMSGROUP_ID__=AuthenticationFG&__START_TRAN_FLAG__=Y&FG_BUTTONS__=LOAD&ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=1&BANK_ID=ICI";

    public ICICIBankScraper(TransactionService transactionService) {
        super(); // Assuming the default constructor of BankScrapper handles Playwright setup
        this.transactionService = transactionService;
    }

    @Override
    public void scrapeBankTransactions(Account account) {
        String accountNumber = account.getAccountNumber();
        log.info("Starting savings account scraping for ICICI account number: {}", accountNumber);

        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        List<ElementHandle> rows = getPage().querySelectorAll("#topbar p");
        for (ElementHandle row : rows) {
            if (row.textContent().contains("BANK ACCOUNTS")) {
                row.hover();
                break;
            }
        }
        
        // Wait for and click the Accounts link by finding the parent anchor tag containing the specific image
        getPage().waitForSelector("a:has(img[src='PR2/L001/consumer/theme/dashboardRevamp/topMenuImages/RACTS/ROACTM.svg'])");
        getPage().click("a:has(img[src='PR2/L001/consumer/theme/dashboardRevamp/topMenuImages/RACTS/ROACTM.svg'])");
        
        // Wait for page load after clicking
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Wait for the account summary table to load
        getPage().waitForSelector("#SummaryList");

        // Find and click the radio button for the specified account number
        for (ElementHandle row : getPage().querySelectorAll("#SummaryList tr")) {
            if (row.textContent().contains(accountNumber)) {
                ElementHandle radio = row.querySelector("input[type='radio']");
                if (radio != null) {
                    radio.click();
                    break;
                }
            }
        }

        // Click the "View Transaction History" button
        getPage().waitForSelector("input[name='Action.VIEW_TRANSACTION_HISTORY']");
        getPage().click("input[name='Action.VIEW_TRANSACTION_HISTORY']");

        // Wait for page load after selecting account
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Select the "Transaction Period" radio button
        getPage().waitForSelector("input[type='radio'][name='SELECTED_RADIO_INDEX'][value='1'][title='Transaction Period']");
        getPage().click("input[type='radio'][name='SELECTED_RADIO_INDEX'][value='1'][title='Transaction Period']");
        
        // Wait for the radio button selection to be processed
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);
        
        // Wait for the dropdown element to be available
        getPage().waitForSelector("#SearchPanel\\.Raa5 .newListSelected");        
        getPage().click("#SearchPanel\\.Raa5 .selectedTxt");

        // Wait for the dropdown options to appear
        getPage().waitForSelector("#SearchPanel\\.Raa5 .newListSelected .SSContainerDivWrapper li");
        
        // Click on the "Last 1 Month" option
        List<ElementHandle> options = getPage().querySelectorAll("#SearchPanel\\.Raa5 .newListSelected .SSContainerDivWrapper li");
        for (ElementHandle option : options) {
            if (option.textContent().trim().equals("Last 1 Month")) {
                option.click();
                break;
            }
        }
        
        // Click on the "VIEW DETAILED STATEMENT" button
        getPage().waitForSelector("input[name='Action.LOAD_HISTORY'][value='VIEW DETAILED STATEMENT']");
        getPage().click("input[name='Action.LOAD_HISTORY'][value='VIEW DETAILED STATEMENT']");
        
        // Wait for the page to load after clicking the button
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);
        
        while (true) {
            getPage().waitForSelector("#txnHistoryList");
    
            // Get all transaction rows except header and separator rows
            List<ElementHandle> transactionRows = getPage().querySelectorAll("#txnHistoryList tr[id]");
    
            processBankTransactions(account, transactionRows);

            // Check for the "Next >" button
            ElementHandle nextButton = getPage().querySelector(".paginationControls input[name='Action.OpTransactionListingTpr.GOTO_NEXT__']");

            // Check if the button exists and is enabled
            if (nextButton != null && !nextButton.isDisabled()) {
                log.info("Navigating to the next page of transactions...");
                nextButton.click();

                // Wait for the next page to load
                getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
                getPage().waitForLoadState(LoadState.NETWORKIDLE);
            } else {
                log.info("No more transaction pages found or 'Next' button is disabled.");
                break; // Exit the loop if no next page
            }
        }

        log.info("Finished savings account scraping for ICICI account number: {}.", accountNumber);
    }

    private void processBankTransactions(Account account, List<ElementHandle> rows) {
        for (ElementHandle row : rows) {
            String rowId = row.getAttribute("id");
            
            // Extract date
            String dateStr = row.querySelector("td:nth-child(3) span[id^='HREF_TransactionHistoryFG.TXN_DATE_ARRAY']").textContent();
            LocalDateTime date = LocalDateTime.parse(dateStr + " 00:00", 
                DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

            // Extract description
            String description = row.querySelector("td:nth-child(5) span[id^='HREF_TransactionHistoryFG.ADDITIONAL_REMARKS_ARRAY']").textContent()
                .replaceAll("\s+", " ").trim();

            // Find withdrawal (debit) amount span within the 6th td
            ElementHandle debitElement = row.querySelector("td:nth-child(6) span[id^='HREF_AmountDisplay']");
            String debitStr = debitElement != null ? debitElement.textContent().trim() : "";
            
            // Find deposit (credit) amount span within the 7th td
            ElementHandle creditElement = row.querySelector("td:nth-child(7) span[id^='HREF_AmountDisplay']");
            String creditStr = creditElement != null ? creditElement.textContent().trim() : "";

            // Clean amount strings by removing non-numeric characters (except decimal point)
            String cleanedDebitStr = debitStr.replaceAll("[^0-9.]", "");
            String cleanedCreditStr = creditStr.replaceAll("[^0-9.]", "");
            
            // Determine transaction type and amount
            Transaction.TransactionType type;
            BigDecimal amount;
            
            if (!cleanedDebitStr.isEmpty()) {
                type = Transaction.TransactionType.DEBIT;
                amount = new BigDecimal(cleanedDebitStr);
            } else if (!cleanedCreditStr.isEmpty()) {
                type = Transaction.TransactionType.CREDIT;
                amount = new BigDecimal(cleanedCreditStr);
            } else {
                // Skip if no valid amount found after cleaning
                log.warn("Skipping row {} as no valid debit or credit amount found after cleaning. Original debit: '{}', Original credit: '{}'", rowId, debitStr, creditStr);
                continue;
            }

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
    public void scrapeCreditCardTransactions(Account account) {
        String cardNumber = account.getAccountNumber();
        log.warn("ICICI Credit Card scraping not implemented yet for card number: {}", cardNumber);
    }

    @Override
    public boolean login(AccountCredentials credentials) {
        // Navigate to login page
        getPage().navigate(ICICI_LOGIN_URL);
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);


        getPage().click("#DUMMY1");
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);

        // getPage().click("#user-id-goahead");
        // getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        // getPage().waitForLoadState(LoadState.NETWORKIDLE);

        getPage().waitForSelector("[name='AuthenticationFG.USER_PRINCIPAL']");
        getPage().fill("[name='AuthenticationFG.USER_PRINCIPAL']", credentials.getUsername());

        getPage().waitForSelector("[name='AuthenticationFG.ACCESS_CODE']");
        getPage().fill("[name='AuthenticationFG.ACCESS_CODE']", credentials.getPassword());

        getPage().click("#VALIDATE_CREDENTIALS1");
        
        return true; // Return true on successful login
    }

    @Override
    public void logout() {
        // Wait for and click the logout button
        getPage().waitForSelector("#HREF_Logout");
        getPage().click("#HREF_Logout");
        
        // Wait for logout to complete
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        closePage();
    }

    @Override
    public String getBankName() {
        return "ICICI";
    }

    @Override
    public Set<AccountType> getSupportedAccountTypes() {
        // ICICI scraper implements both bank and (partially) credit card scraping
        return EnumSet.of(AccountType.SAVINGS, AccountType.CREDIT_CARD);
    }
} 