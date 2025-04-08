package com.myfi.scraping.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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
    public List<Transaction> scrapeBankTransactions(Account account) {
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
        rows = getPage().querySelectorAll("#SummaryList tr");
        for (ElementHandle row : rows) {
            if (row.textContent().contains(accountNumber)) {
                ElementHandle radio = row.querySelector("input[type='radio']");
                if (radio != null) {
                    radio.click();
                    break;
                }
            }
        }

        // Click the "Last 10 Transactions" button
        getPage().waitForSelector("input[name='Action.VIEW_MINI_STATEMENT']");
        getPage().click("input[name='Action.VIEW_MINI_STATEMENT']");

        // Wait for page load after selecting account
        getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
        getPage().waitForLoadState(LoadState.NETWORKIDLE);

        // Wait for transactions table to load
        getPage().waitForSelector("#transactionsList");

        List<Transaction> transactions = new ArrayList<>();

        // Get all transaction rows except header and separator rows
        rows = getPage().querySelectorAll("#transactionsList tr[id]");

        for (ElementHandle row : rows) {
            // Extract date
            String dateStr = row.querySelector("#HREF_txnDateOutput\\[" + row.getAttribute("id") + "\\]").textContent();
            LocalDateTime date = LocalDateTime.parse(dateStr + " 00:00", 
                DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

            // Extract description
            String description = row.querySelector("#HREF_txnRemarksOutput\\[" + row.getAttribute("id") + "\\]").textContent();

            // Extract amount
            String amountStr = row.querySelector("#HREF_amountOutput\\[" + row.getAttribute("id") + "\\]").textContent()
                .replaceAll("[^0-9.]", ""); // Remove all non-numeric chars except decimal
            BigDecimal amount = new BigDecimal(amountStr);

            // Determine transaction type
            String typeStr = row.querySelector("#HREF_amountTypeOutput\\[" + row.getAttribute("id") + "\\]").textContent();
            Transaction.TransactionType type = typeStr.equals("Dr.") ? 
                Transaction.TransactionType.DEBIT : Transaction.TransactionType.CREDIT;

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

            transactions.add(transaction);
        }

        log.info("Finished savings account scraping for ICICI account number: {}. Found {} transactions.", accountNumber, transactions.size());
        return transactions;
    }

    @Override
    public List<Transaction> scrapeCreditCardTransactions(Account account) {
        String cardNumber = account.getAccountNumber();
        log.warn("ICICI Credit Card scraping not implemented yet for card number: {}", cardNumber);
        return new ArrayList<>();
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