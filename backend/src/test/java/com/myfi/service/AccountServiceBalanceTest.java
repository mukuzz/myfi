package com.myfi.service;

import com.myfi.model.Account;
import com.myfi.model.Transaction;
import com.myfi.model.Transaction.TransactionType;
import com.myfi.repository.AccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountServiceBalanceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AccountHistoryService accountHistoryService;

    @InjectMocks
    private AccountService accountService;

    private Account rootAccount;
    private Account childAccount;
    private Account grandChildAccount;
    private Transaction creditTransaction;
    private Transaction debitTransaction;

    @BeforeEach
    void setUp() {
        rootAccount = new Account();
        rootAccount.setId(1L);
        rootAccount.setName("Root Account");
        rootAccount.setBalance(BigDecimal.valueOf(1000));
        rootAccount.setParentAccountId(null);

        childAccount = new Account();
        childAccount.setId(2L);
        childAccount.setName("Child Account");
        childAccount.setBalance(BigDecimal.ZERO);
        childAccount.setParentAccountId(1L);

        grandChildAccount = new Account();
        grandChildAccount.setId(3L);
        grandChildAccount.setName("Grandchild Account");
        grandChildAccount.setBalance(BigDecimal.ZERO);
        grandChildAccount.setParentAccountId(2L);

        creditTransaction = new Transaction();
        creditTransaction.setId(1L);
        creditTransaction.setAmount(BigDecimal.valueOf(500));
        creditTransaction.setType(TransactionType.CREDIT);
        creditTransaction.setDescription("Credit transaction");
        creditTransaction.setTransactionDate(LocalDateTime.now());

        debitTransaction = new Transaction();
        debitTransaction.setId(2L);
        debitTransaction.setAmount(BigDecimal.valueOf(200));
        debitTransaction.setType(TransactionType.DEBIT);
        debitTransaction.setDescription("Debit transaction");
        debitTransaction.setTransactionDate(LocalDateTime.now());
    }

    @Test
    void addToBalance_shouldHandleCreditTransactionCorrectly() {
        when(accountHistoryService.getLatestBalanceForAccount(1L)).thenReturn(Optional.of(BigDecimal.valueOf(1000)));

        accountService.addToBalance(rootAccount, creditTransaction);

        // Credit should add positive amount to balance
        verify(accountHistoryService).createAccountHistoryRecord(1L, BigDecimal.valueOf(1500));
    }

    @Test
    void addToBalance_shouldHandleDebitTransactionCorrectly() {
        when(accountHistoryService.getLatestBalanceForAccount(1L)).thenReturn(Optional.of(BigDecimal.valueOf(1000)));

        accountService.addToBalance(rootAccount, debitTransaction);

        // Debit should subtract amount from balance
        verify(accountHistoryService).createAccountHistoryRecord(1L, BigDecimal.valueOf(800));
    }

    @Test
    void subtractFromBalance_shouldReverseCreditTransactionCorrectly() {
        when(accountHistoryService.getLatestBalanceForAccount(1L)).thenReturn(Optional.of(BigDecimal.valueOf(1500)));

        accountService.subtractFromBalance(rootAccount, creditTransaction);

        // Subtracting credit should remove the positive effect
        verify(accountHistoryService).createAccountHistoryRecord(1L, BigDecimal.valueOf(1000));
    }

    @Test
    void subtractFromBalance_shouldReverseDebitTransactionCorrectly() {
        when(accountHistoryService.getLatestBalanceForAccount(1L)).thenReturn(Optional.of(BigDecimal.valueOf(800)));

        accountService.subtractFromBalance(rootAccount, debitTransaction);

        // Subtracting debit should add back the amount
        verify(accountHistoryService).createAccountHistoryRecord(1L, BigDecimal.valueOf(1000));
    }

    @Test
    void updateBalance_shouldUpdateParentAccountWhenChildHasParent() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(rootAccount));
        when(accountHistoryService.getLatestBalanceForAccount(1L)).thenReturn(Optional.of(BigDecimal.valueOf(1000)));

        accountService.updateBalance(childAccount, BigDecimal.valueOf(100));

        // Should update parent account balance, not child
        verify(accountHistoryService).createAccountHistoryRecord(1L, BigDecimal.valueOf(1100));
        verify(accountHistoryService, never()).createAccountHistoryRecord(eq(2L), any());
    }

    @Test
    void updateBalance_shouldHandleCircularReference() {
        // Create circular reference: account A -> account B -> account A
        Account accountA = new Account();
        accountA.setId(10L);
        accountA.setParentAccountId(11L);

        Account accountB = new Account();
        accountB.setId(11L);
        accountB.setParentAccountId(10L); // Circular reference

        when(accountRepository.findById(11L)).thenReturn(Optional.of(accountB));
        when(accountRepository.findById(10L)).thenReturn(Optional.of(accountA));

        // This should not cause infinite recursion
        assertDoesNotThrow(() -> {
            accountService.updateBalance(accountA, BigDecimal.valueOf(100));
        });

        // Should not create any account history due to circular reference detection
        verify(accountHistoryService, never()).createAccountHistoryRecord(any(), any());
    }

    @Test
    void updateBalance_shouldHandleMissingParentAccount() {
        when(accountRepository.findById(1L)).thenReturn(Optional.empty());

        // Should not throw exception when parent account is missing
        assertDoesNotThrow(() -> {
            accountService.updateBalance(childAccount, BigDecimal.valueOf(100));
        });

        verify(accountHistoryService, never()).createAccountHistoryRecord(any(), any());
    }

    @Test
    void addToBalance_shouldThrowExceptionForNullTransaction() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            accountService.addToBalance(rootAccount, null);
        });

        assertEquals("Transaction must not be null", exception.getMessage());
    }

    @Test
    void addToBalance_shouldThrowExceptionForNullAccount() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            accountService.addToBalance(null, creditTransaction);
        });

        assertEquals("Account must not be null", exception.getMessage());
    }

    @Test
    void addToBalance_shouldThrowExceptionForNullTransactionAmount() {
        Transaction transactionWithNullAmount = new Transaction();
        transactionWithNullAmount.setAmount(null);
        transactionWithNullAmount.setType(TransactionType.CREDIT);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            accountService.addToBalance(rootAccount, transactionWithNullAmount);
        });

        assertEquals("Transaction amount must not be null", exception.getMessage());
    }

    @Test
    void addToBalance_shouldThrowExceptionForNullTransactionType() {
        Transaction transactionWithNullType = new Transaction();
        transactionWithNullType.setAmount(BigDecimal.valueOf(100));
        transactionWithNullType.setType(null);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            accountService.addToBalance(rootAccount, transactionWithNullType);
        });

        assertEquals("Transaction type must not be null", exception.getMessage());
    }

    @Test
    void updateBalance_shouldHandleZeroBalance() {
        rootAccount.setBalance(BigDecimal.ZERO);
        when(accountHistoryService.getLatestBalanceForAccount(1L)).thenReturn(Optional.of(BigDecimal.ZERO));

        accountService.updateBalance(rootAccount, BigDecimal.valueOf(100));

        verify(accountHistoryService).createAccountHistoryRecord(1L, BigDecimal.valueOf(100));
    }

    @Test
    void updateBalance_shouldHandleNullCurrentBalance() {
        rootAccount.setBalance(null);
        when(accountHistoryService.getLatestBalanceForAccount(1L)).thenReturn(Optional.empty());

        accountService.updateBalance(rootAccount, BigDecimal.valueOf(100));

        // Should default to zero and add the change
        verify(accountHistoryService).createAccountHistoryRecord(1L, BigDecimal.valueOf(100));
    }
}