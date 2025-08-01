package com.myfi.mailscraping.service;

import com.myfi.model.Account;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class AccountMatchingServiceTest {

    @InjectMocks
    private AccountMatchingService accountMatchingService;

    private Account hdfcCreditCard;
    private Account iciciCreditCard;
    private Account hdfcSavings;
    private Account onecardAccount;
    private List<Account> testAccounts;

    @BeforeEach
    void setUp() {
        hdfcCreditCard = new Account();
        hdfcCreditCard.setId(1L);
        hdfcCreditCard.setName("HDFC");
        hdfcCreditCard.setType(Account.AccountType.CREDIT_CARD);
        hdfcCreditCard.setAccountNumber("1234567890123456");
        hdfcCreditCard.setBalance(BigDecimal.valueOf(5000));
        hdfcCreditCard.setCurrency("INR");
        hdfcCreditCard.setActive(true);
        hdfcCreditCard.setCreatedAt(LocalDateTime.now());

        iciciCreditCard = new Account();
        iciciCreditCard.setId(2L);
        iciciCreditCard.setName("ICICI");
        iciciCreditCard.setType(Account.AccountType.CREDIT_CARD);
        iciciCreditCard.setAccountNumber("9876543210987654");
        iciciCreditCard.setBalance(BigDecimal.valueOf(3000));
        iciciCreditCard.setCurrency("INR");
        iciciCreditCard.setActive(true);
        iciciCreditCard.setCreatedAt(LocalDateTime.now());

        hdfcSavings = new Account();
        hdfcSavings.setId(3L);
        hdfcSavings.setName("HDFC");
        hdfcSavings.setType(Account.AccountType.SAVINGS);
        hdfcSavings.setAccountNumber("50100123456789");
        hdfcSavings.setBalance(BigDecimal.valueOf(10000));
        hdfcSavings.setCurrency("INR");
        hdfcSavings.setActive(true);
        hdfcSavings.setCreatedAt(LocalDateTime.now());

        onecardAccount = new Account();
        onecardAccount.setId(4L);
        onecardAccount.setName("OneCard");
        onecardAccount.setType(Account.AccountType.CREDIT_CARD);
        onecardAccount.setAccountNumber("5555444433332222");
        onecardAccount.setBalance(BigDecimal.valueOf(2000));
        onecardAccount.setCurrency("INR");
        onecardAccount.setActive(true);
        onecardAccount.setCreatedAt(LocalDateTime.now());

        testAccounts = Arrays.asList(hdfcCreditCard, iciciCreditCard, hdfcSavings, onecardAccount);
    }

    @Test
    void findMatchingAccounts_shouldReturnMatchingAccountsByAccountNumber() {
        String emailContent = "Your HDFC Credit Card ending with 3456 has been used for a transaction of Rs. 1500";

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        assertEquals(1, matches.size());
        assertEquals(hdfcCreditCard.getId(), matches.get(0).getId());
    }

    @Test
    void findMatchingAccounts_shouldReturnMultipleMatchingAccounts() {
        String emailContent = "Transaction alert from HDFC Bank. Card ending 3456 and account 6789 have been updated";

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        assertEquals(2, matches.size());
        assertTrue(matches.stream().anyMatch(acc -> acc.getId().equals(hdfcCreditCard.getId())));
        assertTrue(matches.stream().anyMatch(acc -> acc.getId().equals(hdfcSavings.getId())));
    }

    @Test
    void findMatchingAccounts_shouldReturnMatchingAccountsByBankName() {
        String emailContent = "Dear ICICI Bank customer, your recent transaction has been processed successfully";

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        assertEquals(1, matches.size());
        assertEquals(iciciCreditCard.getId(), matches.get(0).getId());
    }

    @Test
    void findMatchingAccounts_shouldReturnEmptyListWhenNoMatches() {
        String emailContent = "This is a generic promotional email with no account information";

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        assertTrue(matches.isEmpty());
    }

    @Test
    void findMatchingAccounts_shouldHandleNullOrEmptyInput() {
        List<Account> matches1 = accountMatchingService.findMatchingAccounts(null, testAccounts);
        List<Account> matches2 = accountMatchingService.findMatchingAccounts("", testAccounts);
        List<Account> matches3 = accountMatchingService.findMatchingAccounts("test", null);

        assertTrue(matches1.isEmpty());
        assertTrue(matches2.isEmpty());
        assertTrue(matches3.isEmpty());
    }

    @Test
    void findAccountsByNumbers_shouldMatchByLastFourDigits() {
        String emailContent = "Transaction on card ending with 3456 for Rs. 500";

        List<Account> matches = accountMatchingService.findAccountsByNumbers(emailContent, testAccounts);

        assertEquals(1, matches.size());
        assertEquals(hdfcCreditCard.getId(), matches.get(0).getId());
    }

    @Test
    void findAccountsByNumbers_shouldMatchByMaskedPattern() {
        String emailContent = "Transaction on card XXXX3456 has been processed";

        List<Account> matches = accountMatchingService.findAccountsByNumbers(emailContent, testAccounts);

        assertEquals(1, matches.size());
        assertEquals(hdfcCreditCard.getId(), matches.get(0).getId());
    }

    @Test
    void findAccountsByNumbers_shouldMatchByVariousPatterns() {
        String emailContent = "Card ending with 2222 was used. Transaction successful.";

        List<Account> matches = accountMatchingService.findAccountsByNumbers(emailContent, testAccounts);

        assertEquals(1, matches.size());
        assertEquals(onecardAccount.getId(), matches.get(0).getId());
    }

    @Test
    void findAccountsByBankName_shouldMatchHDFCVariations() {
        String emailContent1 = "Alert from HDFC Bank regarding your account";
        String emailContent2 = "Housing Development Finance Corporation notification";

        List<Account> matches1 = accountMatchingService.findAccountsByBankName(emailContent1, testAccounts);
        List<Account> matches2 = accountMatchingService.findAccountsByBankName(emailContent2, testAccounts);

        // Should match both HDFC accounts
        assertEquals(2, matches1.size());
        assertTrue(matches1.stream().anyMatch(acc -> acc.getId().equals(hdfcCreditCard.getId())));
        assertTrue(matches1.stream().anyMatch(acc -> acc.getId().equals(hdfcSavings.getId())));

        assertEquals(2, matches2.size());
        assertTrue(matches2.stream().anyMatch(acc -> acc.getId().equals(hdfcCreditCard.getId())));
        assertTrue(matches2.stream().anyMatch(acc -> acc.getId().equals(hdfcSavings.getId())));
    }

    @Test
    void findAccountsByBankName_shouldMatchICICIVariations() {
        String emailContent = "Industrial Credit and Investment Corporation notification";

        List<Account> matches = accountMatchingService.findAccountsByBankName(emailContent, testAccounts);

        assertEquals(1, matches.size());
        assertEquals(iciciCreditCard.getId(), matches.get(0).getId());
    }

    @Test
    void findAccountsByBankName_shouldMatchOnecardVariations() {
        String emailContent1 = "OneCard transaction alert";
        String emailContent2 = "Federal Bank powered One Card notification";

        List<Account> matches1 = accountMatchingService.findAccountsByBankName(emailContent1, testAccounts);
        List<Account> matches2 = accountMatchingService.findAccountsByBankName(emailContent2, testAccounts);

        assertEquals(1, matches1.size());
        assertEquals(onecardAccount.getId(), matches1.get(0).getId());

        assertEquals(1, matches2.size());
        assertEquals(onecardAccount.getId(), matches2.get(0).getId());
    }

    @Test
    void validateAccountMatch_shouldReturnTrueForMatchingAccountNumbers() {
        boolean result = accountMatchingService.validateAccountMatch(hdfcCreditCard, "1234567890123456");
        assertTrue(result);
    }

    @Test
    void validateAccountMatch_shouldReturnTrueForMatchingLastFourDigits() {
        boolean result = accountMatchingService.validateAccountMatch(hdfcCreditCard, "XXXX3456");
        assertTrue(result);
    }

    @Test
    void validateAccountMatch_shouldReturnFalseForNonMatchingAccountNumbers() {
        boolean result = accountMatchingService.validateAccountMatch(hdfcCreditCard, "9999888877776666");
        assertFalse(result);
    }

    @Test
    void validateAccountMatch_shouldReturnTrueForNullAccountNumber() {
        boolean result1 = accountMatchingService.validateAccountMatch(hdfcCreditCard, null);
        boolean result2 = accountMatchingService.validateAccountMatch(hdfcCreditCard, "");

        assertTrue(result1);
        assertTrue(result2);
    }

    @Test
    void validateAccountMatch_shouldReturnFalseForNullAccount() {
        boolean result = accountMatchingService.validateAccountMatch(null, "1234");
        assertFalse(result);
    }

    @Test
    void validateAccountMatchWithEmailContent_shouldReturnTrueForMatchingContent() {
        String emailContent = "HDFC Bank transaction alert for card ending 3456";

        boolean result = accountMatchingService.validateAccountMatchWithEmailContent(hdfcCreditCard, emailContent);
        assertTrue(result);
    }

    @Test
    void validateAccountMatchWithEmailContent_shouldReturnFalseForNonMatchingContent() {
        String emailContent = "SBI Bank transaction alert";

        boolean result = accountMatchingService.validateAccountMatchWithEmailContent(hdfcCreditCard, emailContent);
        assertFalse(result);
    }

    @Test
    void validateAccountMatchWithEmailContent_shouldHandleNullInputs() {
        boolean result1 = accountMatchingService.validateAccountMatchWithEmailContent(null, "content");
        boolean result2 = accountMatchingService.validateAccountMatchWithEmailContent(hdfcCreditCard, null);

        assertFalse(result1);
        assertFalse(result2);
    }

    @Test
    void findMatchingAccounts_shouldAvoidDuplicates() {
        String emailContent = "HDFC Bank alert: Card 3456 and account ending 3456 transaction";

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        // Should not have duplicates of the same account even if it matches multiple criteria
        long hdfcMatches = matches.stream().filter(acc -> acc.getId().equals(hdfcCreditCard.getId())).count();
        assertEquals(1, hdfcMatches);
    }

    @Test
    void findMatchingAccounts_shouldHandleSpecialCharactersInAccountNumbers() {
        String emailContent = "Card ending with 3-4-5-6 transaction successful";

        List<Account> matches = accountMatchingService.findMatchingAccounts(emailContent, testAccounts);

        // Should still match despite special characters
        assertEquals(1, matches.size());
        assertEquals(hdfcCreditCard.getId(), matches.get(0).getId());
    }
}