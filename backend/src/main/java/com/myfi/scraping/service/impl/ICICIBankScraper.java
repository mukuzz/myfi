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
import com.myfi.service.AccountHistoryService;
import com.myfi.service.TransactionService;
import com.myfi.model.Account.AccountType;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class ICICIBankScraper extends BankScrapper {

    @Autowired
    private TransactionService transactionService;
    private AccountHistoryService accountHistoryService;

    private static final String ICICI_LOGIN_URL = "https://infinity.icicibank.com/corp/AuthenticationController?FORMSGROUP_ID__=AuthenticationFG&__START_TRAN_FLAG__=Y&FG_BUTTONS__=LOAD&ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=1&BANK_ID=ICI";

    @Autowired
    public ICICIBankScraper(TransactionService transactionService, AccountHistoryService accountHistoryService) {
        super();
        this.transactionService = transactionService;
        this.accountHistoryService = accountHistoryService;
    }

    @Override
    public void scrapeBankTransactions(Account account) {
        String accountNumber = account.getAccountNumber();
        log.info("Starting savings account scraping for ICICI account number: {}", accountNumber);
        try {
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

                    // Extract the current balance from the account row
                    ElementHandle balanceElement = row.querySelector("span[id^='HREF_actBalOutput']");
                    if (balanceElement != null) {
                        String balanceText = balanceElement.textContent().trim();
                        // Clean up the balance text to extract just the number (remove commas and other non-numeric chars)
                        String cleanedBalanceText = balanceText.replaceAll("[^0-9.-]", "");
                        BigDecimal currentBalance = new BigDecimal(cleanedBalanceText);
                        
                        log.info("Current balance for ICICI account {}: {}", account.getAccountNumber(), currentBalance);
                        
                        // Save the current balance to account history
                        accountHistoryService.createAccountHistoryRecord(account.getId(), currentBalance);
                    } else {
                        log.warn("Could not find balance element for ICICI account: {}", account.getAccountNumber());
                    }

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
        } catch (Exception e) {
            log.error("Error during ICICI savings account scraping for account {}: {}", accountNumber, e.getMessage(), e);
        }
    }

    private void processBankTransactions(Account account, List<ElementHandle> rows) {
        for (ElementHandle row : rows) {
            try {
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
            } catch (Exception e) {
                log.error("Failed to process ICICI savings transaction row. Error: {}", e.getMessage(), e);
                // Continue processing next row
            }
        }
    }

    @Override
    public void scrapeCreditCardTransactions(Account account) {
        String cardNumber = account.getAccountNumber();
        log.info("Starting credit card scraping for ICICI card number: {}", cardNumber);
        String cardLabel = null; // Keep track of the found card label

        try {
            getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
            getPage().waitForLoadState(LoadState.NETWORKIDLE);

            List<ElementHandle> rows = getPage().querySelectorAll("#topbar p");
            for (ElementHandle row : rows) {
                if (row.textContent().contains("CARDS & LOANS")) {
                    row.hover();
                    break;
                }
            }
                
            // Wait for and click the Accounts link by finding the parent anchor tag containing the specific image
            getPage().waitForSelector("a:has(img[src='PR2/L001/consumer/theme/dashboardRevamp/topMenuImages/CARDLN/RCCRDM.svg'])");
            getPage().click("a:has(img[src='PR2/L001/consumer/theme/dashboardRevamp/topMenuImages/CARDLN/RCCRDM.svg'])");
            
            // Wait for page load after clicking
            getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
            getPage().waitForLoadState(LoadState.NETWORKIDLE);

            getPage().waitForSelector(".credit-nav");

            // Find the credit card tab that matches the account number
            List<ElementHandle> cardTabs = getPage().querySelectorAll(".nav-tabs .nav-link");
            boolean cardFound = false;

            for (ElementHandle tab : cardTabs) {
                // Extract card number from the tab
                ElementHandle cardNumElement = tab.querySelector("p.card-num");
                cardLabel = cardNumElement != null ? cardNumElement.textContent() : tab.textContent();
                log.debug("Checking credit card tab: {}", cardLabel);
                
                // Check if this tab contains the card number (last 4 digits)
                String lastThreeDigits = cardNumber.substring(cardNumber.length() - 3);
                if (cardLabel.endsWith(lastThreeDigits)) {
                    log.info("Found matching credit card tab for card ending with {}", lastThreeDigits);
                    tab.click();
                    cardFound = true;
                    
                    // Wait for the tab content to load
                    getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
                    getPage().waitForLoadState(LoadState.NETWORKIDLE);
                    break;
                }
            }
            
            if (!cardFound) {
                log.warn("Could not find credit card tab matching card number: {}", cardNumber);
                return;
            }

            // Extract credit card balance information from the matching tab panel
            log.info("Extracting credit card balance information for card: {}", cardLabel);
            
            // Find the tab panel that contains the card information
            List<ElementHandle> tabPanels = getPage().querySelectorAll("div[role='tabpanel']");
            ElementHandle matchingPanel = null;
            
            for (ElementHandle panel : tabPanels) {
                String panelText = panel.textContent();
                if (panelText.contains(cardLabel)) {
                    log.debug("Found matching tab panel for card: {}", cardLabel);
                    matchingPanel = panel;
                    break;
                }
            }
            
            if (matchingPanel == null) {
                log.warn("Could not find tab panel containing card information for: {}", cardLabel);
                return;
            }

            // Click on the "Current Statement" link using href attribute
            matchingPanel.waitForSelector("a[href='javascript:currentStatement();']");
            ElementHandle currentStatementLink = matchingPanel.querySelector("a[href='javascript:currentStatement();']");
            currentStatementLink.click();

            // Wait for the statement to load
            getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
            getPage().waitForLoadState(LoadState.NETWORKIDLE);

            // Extract the current outstanding amount from the statement summary
            try {
                getPage().waitForSelector("#DispFormWithTableContent");
                
                // First check if the element contains "Statement Summary" text
                ElementHandle statementSummarySection = getPage().querySelector("#DispFormWithTableContent:has-text('Statement Summary')");
                
                if (statementSummarySection != null) {
                    // Look for the table containing "Current Outstanding Amount"
                    ElementHandle summaryTable = statementSummarySection.querySelector("table:has(th:has-text('Current Outstanding Amount'))");
                    
                    if (summaryTable != null) {
                        // Find the cell with the current outstanding amount (5th column in the table)
                        ElementHandle outstandingCell = summaryTable.querySelector("tr.linesbg td:nth-child(5) span.tableGlobal");
                        
                        if (outstandingCell != null) {
                            String outstandingText = outstandingCell.textContent().trim();
                            // Clean up the balance text to extract just the number
                            String cleanedOutstandingText = outstandingText.replaceAll("[^0-9.-]", "");
                            BigDecimal currentBalance = new BigDecimal(cleanedOutstandingText);
                            
                            log.info("Current outstanding amount for ICICI credit card {}: {}", cardNumber, currentBalance);
                            
                            // Save the current balance to account history (as negative value since it's credit card debt)
                            accountHistoryService.createAccountHistoryRecord(account.getId(), currentBalance.negate());
                        } else {
                            log.warn("Could not find current outstanding amount cell for ICICI credit card: {}", cardNumber);
                        }
                    } else {
                        log.warn("Could not find statement summary table for ICICI credit card: {}", cardNumber);
                    }
                } else {
                    log.warn("Could not find Statement Summary section for ICICI credit card: {}", cardNumber);
                }
            } catch (Exception e) {
                log.error("Error extracting ICICI credit card balance for card {}: {}", cardNumber, e.getMessage(), e);
                // Continue to transaction scraping even if balance fails
            }
            
            // extract the transactions
            try {
                getPage().waitForSelector("#ListingTable3 #Redeem");
                ElementHandle transactionTable = getPage().querySelector("#ListingTable3 #Redeem");
                if (transactionTable != null) {
                    List<ElementHandle> transactionRows = transactionTable.querySelectorAll("tbody tr.listgreyrow");
                    processCreditCardTransactions(account, transactionRows);
                } else {
                    log.warn("Could not find credit card transaction table for card: {}", cardNumber);
                }
            } catch (Exception e) {
                log.error("Error scraping ICICI credit card transactions for card {}: {}", cardNumber, e.getMessage(), e);
            }

            log.info("Finished credit card scraping for ICICI card number: {}.", cardNumber);
        } catch (Exception e) {
            log.error("Error during ICICI credit card scraping for card {}: {}", cardNumber, e.getMessage(), e);
        }
    }

    private void processCreditCardTransactions(Account account, List<ElementHandle> rows) {
        for (ElementHandle row : rows) {
            try {
                // Extract date (1st cell)
                String dateStr = row.querySelector("td:nth-child(1)").textContent().trim();
                LocalDateTime date = LocalDateTime.parse(dateStr + " 00:00", 
                    DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));

                // Extract description (3rd cell)
                String description = row.querySelector("td:nth-child(3)").textContent().trim()
                    .replaceAll("\\s+", " ").trim(); // Normalize whitespace

                // Extract amount string (4th cell)
                String amountStr = row.querySelector("td:nth-child(4)").textContent().trim();

                // Determine transaction type and amount
                Transaction.TransactionType type;
                BigDecimal amount;
                String cleanedAmountStr = amountStr.replace("Dr.", "").replace("Cr.", "").replaceAll("[^0-9.]", ""); // Remove non-numeric chars and Dr./Cr. indicators

                if (amountStr.contains("Dr.")) {
                    type = Transaction.TransactionType.DEBIT;
                    amount = new BigDecimal(cleanedAmountStr);
                } else if (amountStr.contains("Cr.")) {
                    type = Transaction.TransactionType.CREDIT;
                    amount = new BigDecimal(cleanedAmountStr); 
                } else {
                    log.warn("Skipping credit card transaction row as type (Dr./Cr.) not found or amount invalid: Date={}, Desc={}, RawAmount={}", dateStr, description, amountStr);
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

            } catch (Exception e) {
                String rowHtml = row.innerHTML(); // Get inner HTML for logging context
                log.error("Error processing credit card transaction row. Row HTML: '{}'. Error: {}", rowHtml, e.getMessage(), e);
            }
        }
    }

    @Override
    public boolean login(AccountCredentials credentials) {
        log.info("Attempting ICICI login for user: {}", credentials.getUsername());
        try {
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
            
            // Add a small wait or check for a post-login element to confirm success
            getPage().waitForLoadState(LoadState.NETWORKIDLE, new com.microsoft.playwright.Page.WaitForLoadStateOptions().setTimeout(60000)); // Wait up to 60s
            // Check for a known element on the dashboard/landing page
            getPage().waitForSelector("#topbar", new com.microsoft.playwright.Page.WaitForSelectorOptions().setTimeout(30000)); // Example selector

            log.info("ICICI login successful for user: {}", credentials.getUsername());
            return true; // Return true on successful login
        } catch (Exception e) {
            log.error("ICICI login failed for user {}: {}", credentials.getUsername(), e.getMessage(), e);
            // Attempt to take a screenshot on failure
            try {
                 getPage().screenshot(new com.microsoft.playwright.Page.ScreenshotOptions()
                         .setPath(java.nio.file.Paths.get("storage/icici-login-failure-" + System.currentTimeMillis() + ".png"))
                         .setFullPage(true));
            } catch (Exception ssEx) {
                 log.warn("Failed to take ICICI login failure screenshot: {}", ssEx.getMessage());
            }
            return false; // Return false on failure
        }
    }

    @Override
    public void logout() {
         try {
             log.info("Attempting ICICI logout.");
            // Wait for and click the logout button
            getPage().waitForSelector("#HREF_Logout");
            getPage().click("#HREF_Logout");
            
            // Wait for logout to complete
            getPage().waitForLoadState(LoadState.DOMCONTENTLOADED);
            getPage().waitForLoadState(LoadState.NETWORKIDLE);
            log.info("ICICI logout successful.");

        } catch (Exception e) {
             log.error("Error during ICICI logout: {}", e.getMessage(), e);
             // Logout failed, but still attempt to close the page resources
        } finally {
            closePage();
            log.info("ICICI browser page closed.");
        }
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