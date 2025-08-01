package com.myfi.mailscraping.service;

import com.myfi.model.Account;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Functional test for email-based processing key components.
 * Tests the core functionality without mocking external dependencies.
 */
class EmailBasedProcessingFunctionalTest {

    private AccountMatchingService accountMatchingService;
    private Account hdfcAccount;
    private Account iciciAccount;
    private Account onecardAccount;
    private List<Account> testAccounts;

    @BeforeEach
    void setUp() {
        accountMatchingService = new AccountMatchingService();
        
        // Setup test accounts
        hdfcAccount = new Account();
        hdfcAccount.setId(1L);
        hdfcAccount.setName("HDFC");
        hdfcAccount.setType(Account.AccountType.CREDIT_CARD);
        hdfcAccount.setAccountNumber("1234567890123456");
        hdfcAccount.setBalance(BigDecimal.valueOf(5000));
        hdfcAccount.setCurrency("INR");
        hdfcAccount.setActive(true);
        hdfcAccount.setCreatedAt(LocalDateTime.now());

        iciciAccount = new Account();
        iciciAccount.setId(2L);
        iciciAccount.setName("ICICI");
        iciciAccount.setType(Account.AccountType.CREDIT_CARD);
        iciciAccount.setAccountNumber("9876543210987654");
        iciciAccount.setBalance(BigDecimal.valueOf(3000));
        iciciAccount.setCurrency("INR");
        iciciAccount.setActive(true);
        iciciAccount.setCreatedAt(LocalDateTime.now());

        onecardAccount = new Account();
        onecardAccount.setId(3L);
        onecardAccount.setName("OneCard");
        onecardAccount.setType(Account.AccountType.CREDIT_CARD);
        onecardAccount.setAccountNumber("5555444433332222");
        onecardAccount.setBalance(BigDecimal.valueOf(2000));
        onecardAccount.setCurrency("INR");
        onecardAccount.setActive(true);
        onecardAccount.setCreatedAt(LocalDateTime.now());

        testAccounts = Arrays.asList(hdfcAccount, iciciAccount, onecardAccount);
    }

    @Test
    void testRealWorldEmailScenario1_HDFCTransactionAlert() {
        String emailContent = """
            Dear Customer,
            
            HDFC Bank Credit Card Alert
            
            Your HDFC Bank Credit Card ending with 3456 has been used for a transaction:
            
            Amount: Rs. 2,500.00
            Merchant: AMAZON.IN
            Date: 15-Jan-2024 14:30:25
            Transaction ID: 1234567890
            
            Available Credit Limit: Rs. 47,500.00
            
            If this transaction was not done by you, please call us immediately at 18002576161.
            
            Thank you for banking with HDFC Bank.
            """;

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        assertEquals(1, matches.size());
        assertEquals("HDFC", matches.get(0).getName());
        assertEquals(hdfcAccount.getId(), matches.get(0).getId());
    }

    @Test
    void testRealWorldEmailScenario2_ICICITransactionAlert() {
        String emailContent = """
            ICICI Bank Credit Card Transaction Alert
            
            Dear Valued Customer,
            
            A transaction has been processed on your ICICI Bank Credit Card ending with 7654.
            
            Transaction Details:
            Amount: INR 1,200.00
            Merchant: SWIGGY
            Date & Time: 16-Jan-2024, 20:15
            Reference No: IC240116201512345
            
            Outstanding Balance: INR 5,600.00
            Available Credit: INR 44,400.00
            
            For any queries, contact us at 1860-120-7777.
            
            Regards,
            ICICI Bank
            """;

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        assertEquals(1, matches.size());
        assertEquals("ICICI", matches.get(0).getName());
        assertEquals(iciciAccount.getId(), matches.get(0).getId());
    }

    @Test
    void testRealWorldEmailScenario3_OneCardTransactionAlert() {
        String emailContent = """
            OneCard Transaction Alert
            
            Hi there! 👋
            
            Your OneCard ending with 2222 was just used:
            
            💳 Amount: ₹850
            🏪 At: Zomato
            🕐 On: Jan 17, 2024 at 7:45 PM
            
            💰 Available credit: ₹49,150
            
            Wasn't you? Report it instantly on the app.
            
            The OneCard Team
            Federal Bank
            """;

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        assertEquals(1, matches.size());
        assertEquals("OneCard", matches.get(0).getName());
        assertEquals(onecardAccount.getId(), matches.get(0).getId());
    }

    @Test
    void testRealWorldEmailScenario4_MultipleAccountMention() {
        String emailContent = """
            Monthly Summary - January 2024
            
            Dear Customer,
            
            Here's your monthly transaction summary:
            
            HDFC Credit Card (****3456):
            - Total Transactions: 15
            - Total Amount: Rs. 25,600
            
            ICICI Credit Card (****7654):
            - Total Transactions: 8
            - Total Amount: Rs. 12,400
            
            Thank you for choosing our services.
            """;

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        assertEquals(2, matches.size());
        assertTrue(matches.stream().anyMatch(acc -> acc.getName().equals("HDFC")));
        assertTrue(matches.stream().anyMatch(acc -> acc.getName().equals("ICICI")));
    }

    @Test
    void testRealWorldEmailScenario5_BalanceUpdateEmail() {
        String emailContent = """
            HDFC Bank Account Balance Alert
            
            Dear Customer,
            
            Your HDFC Bank Savings Account ending with 3456 has been credited.
            
            Transaction Details:
            Amount Credited: Rs. 50,000.00
            Transaction Type: NEFT
            Date: 18-Jan-2024
            Reference Number: N12345678901234
            
            Current Available Balance: Rs. 1,25,000.00
            
            Thank you for banking with HDFC Bank.
            """;

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        assertEquals(1, matches.size());
        assertEquals("HDFC", matches.get(0).getName());
    }

    @Test
    void testRealWorldEmailScenario6_UnknownBankEmail() {
        String emailContent = """
            SBI Bank Transaction Alert
            
            Dear Customer,
            
            Your SBI Credit Card ending with 9999 has been used for a transaction of Rs. 3,000.
            
            Thank you for banking with SBI.
            """;

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        assertTrue(matches.isEmpty());
    }

    @Test
    void testRealWorldEmailScenario7_MaskedAccountNumbers() {
        String emailContent = """
            Transaction Alert
            
            HDFC Bank notification:
            
            Card Number: XXXX-XXXX-XXXX-3456
            Amount: Rs. 1,500
            Merchant: PVR Cinemas
            
            Thank you!
            """;

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        assertEquals(1, matches.size());
        assertEquals("HDFC", matches.get(0).getName());
    }

    @Test
    void testAccountValidationScenarios() {
        // Test various account number validation scenarios
        
        // Exact match
        assertTrue(accountMatchingService.validateAccountMatch(hdfcAccount, "1234567890123456"));
        
        // Last 4 digits match
        assertTrue(accountMatchingService.validateAccountMatch(hdfcAccount, "XXXX3456"));
        assertTrue(accountMatchingService.validateAccountMatch(hdfcAccount, "****3456"));
        assertTrue(accountMatchingService.validateAccountMatch(hdfcAccount, "3456"));
        
        // Non-matching account numbers
        assertFalse(accountMatchingService.validateAccountMatch(hdfcAccount, "9999888877776666"));
        assertFalse(accountMatchingService.validateAccountMatch(hdfcAccount, "1111"));
        
        // Edge cases
        assertTrue(accountMatchingService.validateAccountMatch(hdfcAccount, null));
        assertTrue(accountMatchingService.validateAccountMatch(hdfcAccount, ""));
        assertFalse(accountMatchingService.validateAccountMatch(null, "1234"));
    }

    @Test
    void testPerformanceWithLargeAccountList() {
        // Create a larger list of accounts for performance testing
        List<Account> largeAccountList = Arrays.asList(
            hdfcAccount, iciciAccount, onecardAccount,
            createTestAccount(4L, "AXIS", "4444333322221111"),
            createTestAccount(5L, "SBI", "5555444433332222"),
            createTestAccount(6L, "KOTAK", "6666555544443333"),
            createTestAccount(7L, "YES", "7777666655554444"),
            createTestAccount(8L, "IDFC", "8888777766665555")
        );

        String emailContent = "ICICI Bank transaction alert for card ending with 7654";
        
        long startTime = System.currentTimeMillis();
        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, largeAccountList);
        long endTime = System.currentTimeMillis();
        
        assertEquals(1, matches.size());
        assertEquals("ICICI", matches.get(0).getName());
        
        // Should complete quickly (under 100ms for this small dataset)
        assertTrue(endTime - startTime < 100, "Account matching should be fast");
    }

    private Account createTestAccount(Long id, String name, String accountNumber) {
        Account account = new Account();
        account.setId(id);
        account.setName(name);
        account.setType(Account.AccountType.CREDIT_CARD);
        account.setAccountNumber(accountNumber);
        account.setBalance(BigDecimal.valueOf(1000));
        account.setCurrency("INR");
        account.setActive(true);
        account.setCreatedAt(LocalDateTime.now());
        return account;
    }
}