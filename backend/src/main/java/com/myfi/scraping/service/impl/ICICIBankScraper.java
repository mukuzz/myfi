package com.myfi.scraping.service.impl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;

import com.microsoft.playwright.ElementHandle;
import com.microsoft.playwright.options.LoadState;
import com.myfi.model.Account;
import com.myfi.model.Transaction;
import com.myfi.scraping.model.BankCredentials;
import com.myfi.scraping.service.BankScrapper;
import com.myfi.service.TransactionService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
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

        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);

        List<ElementHandle> rows = page.querySelectorAll("#topbar p");
        for (ElementHandle row : rows) {
            if (row.textContent().contains("BANK ACCOUNTS")) {
                row.hover();
                break;
            }
        }
        
        // Wait for and click the Accounts link by finding the parent anchor tag containing the specific image
        page.waitForSelector("a:has(img[src='PR2/L001/consumer/theme/dashboardRevamp/topMenuImages/RACTS/ROACTM.svg'])");
        page.click("a:has(img[src='PR2/L001/consumer/theme/dashboardRevamp/topMenuImages/RACTS/ROACTM.svg'])");
        
        // Wait for page load after clicking
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);

        // Wait for the account summary table to load
        page.waitForSelector("#SummaryList");

        // Find and click the radio button for the specified account number
        rows = page.querySelectorAll("#SummaryList tr");
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
        page.waitForSelector("input[name='Action.VIEW_MINI_STATEMENT']");
        page.click("input[name='Action.VIEW_MINI_STATEMENT']");

        // Wait for page load after selecting account
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);

        // Wait for transactions table to load
        page.waitForSelector("#transactionsList");

        List<Transaction> transactions = new ArrayList<>();

        // Get all transaction rows except header and separator rows
        rows = page.querySelectorAll("#transactionsList tr[id]");

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
                .accountId(account.getId())
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
    public boolean login(BankCredentials credentials) {
        // Navigate to login page
        page.navigate(ICICI_LOGIN_URL);
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);


        page.click("#DUMMY1");
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);

        // page.click("#user-id-goahead");
        // page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        // page.waitForLoadState(LoadState.NETWORKIDLE);

        page.waitForSelector("[name='AuthenticationFG.USER_PRINCIPAL']");
        page.fill("[name='AuthenticationFG.USER_PRINCIPAL']", credentials.getUsername());

        page.waitForSelector("[name='AuthenticationFG.ACCESS_CODE']");
        page.fill("[name='AuthenticationFG.ACCESS_CODE']", credentials.getPassword());

        page.click("#VALIDATE_CREDENTIALS1");
        
        return true; // Return true on successful login
    }

    @Override
    public void logout() {
        // Wait for and click the logout button
        page.waitForSelector("#HREF_Logout");
        page.click("#HREF_Logout");
        
        // Wait for logout to complete
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
        page.waitForLoadState(LoadState.NETWORKIDLE);

        page.close();
    }

    @Override
    public String getBankName() {
        return "ICICI Bank";
    }
} 