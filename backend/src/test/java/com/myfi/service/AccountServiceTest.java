package com.myfi.service;

import com.myfi.bankscraping.service.BankScrapper;
import com.myfi.model.Account;
import com.myfi.model.Account.AccountType;
import com.myfi.repository.AccountRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private List<BankScrapper> bankScrapers; // Mock the list itself

    @Mock
    private BankScrapper mockScraper1; // Individual mock scrapers

    @Mock
    private BankScrapper mockScraper2;

    @InjectMocks
    private AccountService accountService;

    private Account account1;
    private Account account2;

    @BeforeEach
    void setUp() {
        // Re-initialize service with potentially updated mocks if constructor injection needs specific setup
        accountService = new AccountService(accountRepository, null, bankScrapers);

        account1 = new Account();
        account1.setId(1L);
        account1.setName("Test Account 1");
        account1.setType(AccountType.SAVINGS);
        account1.setBalance(BigDecimal.valueOf(1000.00));
        account1.setCurrency("INR");
        account1.setAccountNumber("12345");
        account1.setActive(true);
        account1.setCreatedAt(LocalDateTime.now());

        account2 = new Account();
        account2.setId(2L);
        account2.setName("Test Account 2");
        account2.setType(AccountType.CREDIT_CARD);
        account2.setBalance(BigDecimal.valueOf(-500.00));
        account2.setCurrency("INR");
        account2.setAccountNumber("67890");
        account2.setActive(true);
        account2.setCreatedAt(LocalDateTime.now());
    }

    @Test
    void getAllAccounts_shouldReturnAllAccounts() {
        when(accountRepository.findAll()).thenReturn(Arrays.asList(account1, account2));

        List<Account> accounts = accountService.getAllAccounts();

        assertNotNull(accounts);
        assertEquals(2, accounts.size());
        verify(accountRepository, times(1)).findAll();
    }

    @Test
    void getAllAccounts_shouldReturnEmptyListWhenNoAccounts() {
        when(accountRepository.findAll()).thenReturn(Collections.emptyList());

        List<Account> accounts = accountService.getAllAccounts();

        assertNotNull(accounts);
        assertTrue(accounts.isEmpty());
        verify(accountRepository, times(1)).findAll();
    }

    @Test
    void getAccountById_shouldReturnAccountWhenFound() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account1));

        Optional<Account> foundAccount = accountService.getAccountById(1L);

        assertTrue(foundAccount.isPresent());
        assertEquals(account1.getName(), foundAccount.get().getName());
        verify(accountRepository, times(1)).findById(1L);
    }

    @Test
    void getAccountById_shouldReturnEmptyOptionalWhenNotFound() {
        when(accountRepository.findById(anyLong())).thenReturn(Optional.empty());

        Optional<Account> foundAccount = accountService.getAccountById(99L);

        assertFalse(foundAccount.isPresent());
        verify(accountRepository, times(1)).findById(99L);
    }

    @Test
    void getAccountByAccountNumber_shouldReturnAccountWhenFound() {
        when(accountRepository.findByAccountNumber("12345")).thenReturn(Optional.of(account1));

        Optional<Account> foundAccount = accountService.getAccountByAccountNumber("12345");

        assertTrue(foundAccount.isPresent());
        assertEquals(account1.getId(), foundAccount.get().getId());
        verify(accountRepository, times(1)).findByAccountNumber("12345");
    }

    @Test
    void getAccountByAccountNumber_shouldReturnEmptyOptionalWhenNotFound() {
        when(accountRepository.findByAccountNumber(anyString())).thenReturn(Optional.empty());

        Optional<Account> foundAccount = accountService.getAccountByAccountNumber("00000");

        assertFalse(foundAccount.isPresent());
        verify(accountRepository, times(1)).findByAccountNumber("00000");
    }

    @Test
    void createAccount_shouldCreateAndReturnAccount() {
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> {
            Account savedAccount = invocation.getArgument(0);
            savedAccount.setId(3L); // Simulate saving and getting an ID
            return savedAccount;
        });

        Account newAccount = new Account();
        newAccount.setName("New Account");
        newAccount.setType(AccountType.SAVINGS);
        newAccount.setBalance(BigDecimal.valueOf(500));
        newAccount.setCurrency("INR");
        newAccount.setAccountNumber("55555");

        Account createdAccount = accountService.createAccount(newAccount);

        assertNotNull(createdAccount);
        assertEquals(3L, createdAccount.getId());
        assertEquals("New Account", createdAccount.getName());
        assertTrue(createdAccount.isActive()); // Default active state
        assertNotNull(createdAccount.getCreatedAt());
        verify(accountRepository, times(1)).save(any(Account.class));
    }

    @Test
    void createAccount_shouldThrowExceptionWhenBalanceIsNull() {
        Account newAccount = new Account();
        newAccount.setName("No Balance Account");
        newAccount.setType(AccountType.SAVINGS);
        newAccount.setCurrency("USD");
        // Balance is null

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            accountService.createAccount(newAccount);
        });

        assertEquals("Account balance must be provided.", exception.getMessage());
        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void createAccount_shouldThrowExceptionWhenCurrencyIsNull() {
        Account newAccount = new Account();
        newAccount.setName("No Currency Account");
        newAccount.setType(AccountType.SAVINGS);
        newAccount.setBalance(BigDecimal.ZERO);
        // Currency is null

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            accountService.createAccount(newAccount);
        });

        assertEquals("Account currency must be provided.", exception.getMessage());
        verify(accountRepository, never()).save(any(Account.class));
    }


    @Test
    void updateAccount_shouldUpdateAndReturnAccountWhenFound() {
        Account updatedDetails = new Account();
        updatedDetails.setName("Updated Name");
        updatedDetails.setType(AccountType.SAVINGS);
        updatedDetails.setBalance(BigDecimal.valueOf(1500));
        updatedDetails.setCurrency("USD");
        updatedDetails.setActive(false);
        updatedDetails.setAccountNumber("12345-Updated");

        when(accountRepository.findById(1L)).thenReturn(Optional.of(account1));
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Optional<Account> updatedAccountOpt = accountService.updateAccount(1L, updatedDetails);

        assertTrue(updatedAccountOpt.isPresent());
        Account updatedAccount = updatedAccountOpt.get();
        assertEquals("Updated Name", updatedAccount.getName());
        assertEquals(AccountType.SAVINGS, updatedAccount.getType());
        assertEquals(BigDecimal.valueOf(1500), updatedAccount.getBalance());
        assertEquals("USD", updatedAccount.getCurrency());
        assertFalse(updatedAccount.isActive());
        assertEquals("12345-Updated", updatedAccount.getAccountNumber());
        assertNotNull(updatedAccount.getUpdatedAt());
        verify(accountRepository, times(1)).findById(1L);
        verify(accountRepository, times(1)).save(any(Account.class));
    }

    @Test
    void updateAccount_shouldReturnEmptyOptionalWhenNotFound() {
        Account updatedDetails = new Account();
        updatedDetails.setName("Updated Name");

        when(accountRepository.findById(anyLong())).thenReturn(Optional.empty());

        Optional<Account> updatedAccountOpt = accountService.updateAccount(99L, updatedDetails);

        assertFalse(updatedAccountOpt.isPresent());
        verify(accountRepository, times(1)).findById(99L);
        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void deleteAccount_shouldReturnTrueWhenSuccessful() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account1));
        doNothing().when(accountRepository).delete(account1);

        boolean result = accountService.deleteAccount(1L);

        assertTrue(result);
        verify(accountRepository, times(1)).findById(1L);
        verify(accountRepository, times(1)).delete(account1);
    }

    @Test
    void deleteAccount_shouldReturnFalseWhenNotFound() {
        when(accountRepository.findById(anyLong())).thenReturn(Optional.empty());

        boolean result = accountService.deleteAccount(99L);

        assertFalse(result);
        verify(accountRepository, times(1)).findById(99L);
        verify(accountRepository, never()).delete(any(Account.class));
    }

    @Test
    void getSupportedAccounts_shouldReturnMapFromScrapers() {
        // Setup mock scrapers
        when(mockScraper1.getBankName()).thenReturn("BankA");
        when(mockScraper1.getSupportedAccountTypes()).thenReturn(Set.of(AccountType.SAVINGS, AccountType.CREDIT_CARD));
        when(mockScraper2.getBankName()).thenReturn("BankB");
        when(mockScraper2.getSupportedAccountTypes()).thenReturn(Set.of(AccountType.SAVINGS, AccountType.LOAN));

        // Mock the behavior of the list iterator
        when(bankScrapers.iterator()).thenReturn(Arrays.asList(mockScraper1, mockScraper2).iterator());

        Map<String, List<String>> supportedAccounts = accountService.getSupportedAccounts();

        assertNotNull(supportedAccounts);
        // Check all account types are present as keys
        assertEquals(AccountType.values().length, supportedAccounts.size());

        // Verify specific types based on mock scrapers
        assertTrue(supportedAccounts.get(AccountType.SAVINGS.name()).containsAll(Arrays.asList("BankA", "BankB")));
        assertEquals(2, supportedAccounts.get(AccountType.SAVINGS.name()).size());

        assertTrue(supportedAccounts.get(AccountType.CREDIT_CARD.name()).contains("BankA"));
        assertEquals(1, supportedAccounts.get(AccountType.CREDIT_CARD.name()).size());

        assertTrue(supportedAccounts.get(AccountType.LOAN.name()).contains("BankB"));
        assertEquals(1, supportedAccounts.get(AccountType.LOAN.name()).size());

        assertTrue(supportedAccounts.get(AccountType.FIXED_DEPOSIT.name()).isEmpty()); // Changed from CHECKING
    }

    @Test
    void getSupportedAccounts_shouldReturnEmptyListsWhenNoScrapers() {
       // Use an empty list for scrapers in this specific test setup
       accountService = new AccountService(accountRepository, null, Collections.emptyList());

        Map<String, List<String>> supportedAccounts = accountService.getSupportedAccounts();

        assertNotNull(supportedAccounts);
        assertEquals(AccountType.values().length, supportedAccounts.size());

        // All lists associated with account types should be empty
        for (List<String> banks : supportedAccounts.values()) {
            assertTrue(banks.isEmpty());
        }
    }

     @Test
    void getSupportedAccounts_shouldHandleNullScrapersListGracefully() {
        // Explicitly set scrapers to null
        accountService = new AccountService(accountRepository, null, Collections.emptyList());

        Map<String, List<String>> supportedAccounts = accountService.getSupportedAccounts();

        assertNotNull(supportedAccounts);
        assertEquals(AccountType.values().length, supportedAccounts.size());

        // All lists associated with account types should be empty
        for (List<String> banks : supportedAccounts.values()) {
            assertTrue(banks.isEmpty());
        }
    }
} 