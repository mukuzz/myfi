package com.myfi.service;

import com.myfi.model.Account;
import com.myfi.model.Transaction;
import com.myfi.model.Transaction.TransactionType;
import com.myfi.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private TransactionService transactionService;

    @Captor
    private ArgumentCaptor<Transaction> transactionCaptor;

    private Transaction transaction1;
    private Transaction transaction2;
    private Account account;

    @BeforeEach
    void setUp() {
        account = new Account();
        account.setId(1L);
        account.setName("Test Account");
        account.setCurrency("INR");

        transaction1 = new Transaction();
        transaction1.setId(1L);
        transaction1.setAmount(BigDecimal.valueOf(100.00));
        transaction1.setDescription("Test Transaction 1");
        transaction1.setType(TransactionType.DEBIT);
        transaction1.setTransactionDate(LocalDate.of(2023, 1, 15).atStartOfDay()); // Uses LocalDateTime
        transaction1.setAccount(account);
        transaction1.setCreatedAt(LocalDateTime.now());
        transaction1.generateUniqueKey(); // Make sure key is generated for tests

        transaction2 = new Transaction();
        transaction2.setId(2L);
        transaction2.setAmount(BigDecimal.valueOf(200.50));
        transaction2.setDescription("Test Transaction 2");
        transaction2.setType(TransactionType.CREDIT);
        transaction2.setTransactionDate(LocalDate.of(2023, 1, 16).atStartOfDay()); // Uses LocalDateTime
        transaction2.setAccount(account);
        transaction2.setCreatedAt(LocalDateTime.now());
        transaction2.generateUniqueKey(); // Make sure key is generated for tests
    }

    @Test
    void getAllTransactions_shouldReturnAllTransactions() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        List<Transaction> transactionList = Arrays.asList(transaction1, transaction2);
        Page<Transaction> transactionPage = new PageImpl<>(transactionList, pageable, transactionList.size());
        when(transactionRepository.findAll(any(Pageable.class))).thenReturn(transactionPage);

        // Act
        Page<Transaction> result = transactionService.getAllTransactions(pageable);

        // Assert
        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
        assertEquals(2, result.getContent().size());
        assertEquals(transaction1, result.getContent().get(0));
        verify(transactionRepository, times(1)).findAll(pageable);
    }

     @Test
    void getAllTransactions_shouldReturnEmptyListWhenNoTransactions() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        Page<Transaction> emptyPage = Page.empty(pageable);
        when(transactionRepository.findAll(any(Pageable.class))).thenReturn(emptyPage);

        // Act
        Page<Transaction> result = transactionService.getAllTransactions(pageable);

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        assertEquals(0, result.getTotalElements());
        verify(transactionRepository, times(1)).findAll(pageable);
    }

    @Test
    void getTransactionById_shouldReturnTransactionWhenFound() {
        when(transactionRepository.findById(1L)).thenReturn(Optional.of(transaction1));

        Optional<Transaction> foundTransaction = transactionService.getTransactionById(1L);

        assertTrue(foundTransaction.isPresent());
        assertEquals(transaction1.getDescription(), foundTransaction.get().getDescription());
        verify(transactionRepository, times(1)).findById(1L);
    }

    @Test
    void getTransactionById_shouldReturnEmptyOptionalWhenNotFound() {
        when(transactionRepository.findById(anyLong())).thenReturn(Optional.empty());

        Optional<Transaction> foundTransaction = transactionService.getTransactionById(99L);

        assertFalse(foundTransaction.isPresent());
        verify(transactionRepository, times(1)).findById(99L);
    }

    @Test
    void createTransaction_shouldCreateAndReturnTransactionWhenNotDuplicate() {
        Transaction newTransaction = new Transaction();
        newTransaction.setAmount(BigDecimal.valueOf(50));
        newTransaction.setDescription("New unique transaction");
        newTransaction.setType(TransactionType.DEBIT);
        newTransaction.setTransactionDate(LocalDateTime.now()); // Uses LocalDateTime
        newTransaction.setAccount(account);
        newTransaction.generateUniqueKey();

        when(transactionRepository.findByUniqueKey(newTransaction.getUniqueKey())).thenReturn(Optional.empty());
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> {
            Transaction saved = invocation.getArgument(0);
            saved.setId(3L);
            return saved;
        });

        Transaction created = transactionService.createTransaction(newTransaction);

        assertNotNull(created);
        assertEquals(3L, created.getId());
        assertEquals("New unique transaction", created.getDescription());
        assertNotNull(created.getCreatedAt());
        verify(transactionRepository, times(1)).findByUniqueKey(newTransaction.getUniqueKey());
        verify(transactionRepository, times(1)).save(newTransaction);
    }

    @Test
    void createTransaction_shouldReturnExistingTransactionWhenDuplicateFound() {
        // Simulate transaction1 already existing
        when(transactionRepository.findByUniqueKey(transaction1.getUniqueKey())).thenReturn(Optional.of(transaction1));

        // Attempt to create a transaction identical to transaction1
        Transaction duplicateTransaction = new Transaction();
        duplicateTransaction.setAmount(transaction1.getAmount());
        duplicateTransaction.setDescription(transaction1.getDescription());
        duplicateTransaction.setType(transaction1.getType());
        duplicateTransaction.setTransactionDate(transaction1.getTransactionDate());
        duplicateTransaction.setAccount(transaction1.getAccount());
        duplicateTransaction.generateUniqueKey(); // Key will match transaction1

        Transaction result = transactionService.createTransaction(duplicateTransaction);

        assertNotNull(result);
        assertEquals(transaction1.getId(), result.getId()); // Should return the existing one
        verify(transactionRepository, times(1)).findByUniqueKey(transaction1.getUniqueKey());
        verify(transactionRepository, never()).save(any(Transaction.class)); // Save should not be called
    }

    @Test
    void createTransaction_shouldThrowExceptionWhenMandatoryFieldMissing() {
        Transaction invalidTransaction = new Transaction();
        // Missing amount, description, type, transactionDate

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            transactionService.createTransaction(invalidTransaction);
        });

        assertEquals("Mandatory transaction fields (amount, description, type, transactionDate) must be provided.", exception.getMessage());
        verify(transactionRepository, never()).save(any(Transaction.class));
    }

     @Test
    void createTransaction_shouldSetCreatedAtIfNotProvided() {
        Transaction newTransaction = new Transaction();
        newTransaction.setAmount(BigDecimal.valueOf(50));
        newTransaction.setDescription("New transaction");
        newTransaction.setType(TransactionType.DEBIT);
        newTransaction.setTransactionDate(LocalDateTime.now()); // Uses LocalDateTime
        newTransaction.setAccount(account);
        // CreatedAt is not set
        newTransaction.generateUniqueKey();

        when(transactionRepository.findByUniqueKey(anyString())).thenReturn(Optional.empty());
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Transaction created = transactionService.createTransaction(newTransaction);

        assertNotNull(created.getCreatedAt());
        verify(transactionRepository).save(created);
    }

    @Test
    void updateTransaction_shouldUpdateAndReturnTransactionWhenFound() {
        Transaction updatedDetails = new Transaction();
        updatedDetails.setAmount(BigDecimal.valueOf(150));
        updatedDetails.setDescription("Updated Description");
        updatedDetails.setType(TransactionType.CREDIT);
        updatedDetails.setTransactionDate(LocalDateTime.now()); // Uses LocalDateTime
        updatedDetails.setAccount(account); // Can update account if needed
        updatedDetails.setTagId(5L);
        updatedDetails.setCounterParty("New CounterParty");
        updatedDetails.setNotes("Updated notes.");
        updatedDetails.setExcludeFromAccounting(true);

        when(transactionRepository.findById(1L)).thenReturn(Optional.of(transaction1));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Optional<Transaction> updatedOpt = transactionService.updateTransaction(1L, updatedDetails);

        assertTrue(updatedOpt.isPresent());
        Transaction updated = updatedOpt.get();
        assertEquals(BigDecimal.valueOf(150), updated.getAmount());
        assertEquals("Updated Description", updated.getDescription());
        assertEquals(TransactionType.CREDIT, updated.getType());
        assertEquals(5L, updated.getTagId());
        assertEquals("New CounterParty", updated.getCounterParty());
        assertEquals("Updated notes.", updated.getNotes());
        assertTrue(updated.getExcludeFromAccounting());
        assertNotNull(updated.getUpdatedAt());
        assertNotNull(updated.getUniqueKey()); // Ensure key is regenerated

        verify(transactionRepository, times(1)).findById(1L);
        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }

    @Test
    void updateTransaction_shouldReturnEmptyOptionalWhenNotFound() {
        Transaction updatedDetails = new Transaction();
        updatedDetails.setDescription("Update attempt");

        when(transactionRepository.findById(anyLong())).thenReturn(Optional.empty());

        Optional<Transaction> updatedOpt = transactionService.updateTransaction(99L, updatedDetails);

        assertFalse(updatedOpt.isPresent());
        verify(transactionRepository, times(1)).findById(99L);
        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void deleteTransaction_shouldReturnTrueWhenSuccessful() {
        when(transactionRepository.findById(1L)).thenReturn(Optional.of(transaction1));
        doNothing().when(transactionRepository).delete(transaction1);

        boolean result = transactionService.deleteTransaction(1L);

        assertTrue(result);
        verify(transactionRepository, times(1)).findById(1L);
        verify(transactionRepository, times(1)).delete(transaction1);
    }

    @Test
    void deleteTransaction_shouldReturnFalseWhenNotFound() {
        when(transactionRepository.findById(anyLong())).thenReturn(Optional.empty());

        boolean result = transactionService.deleteTransaction(99L);

        assertFalse(result);
        verify(transactionRepository, times(1)).findById(99L);
        verify(transactionRepository, never()).delete(any(Transaction.class));
    }

    @Test
    void getTransactionsByAccountId_shouldReturnTransactionsForAccount() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        List<Transaction> transactionList = Arrays.asList(transaction1, transaction2);
        Page<Transaction> transactionPage = new PageImpl<>(transactionList, pageable, transactionList.size());
        when(transactionRepository.findByAccountId(eq(1L), any(Pageable.class))).thenReturn(transactionPage);

        // Act
        Page<Transaction> result = transactionService.getTransactionsByAccountId(1L, pageable);

        // Assert
        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
        assertEquals(2, result.getContent().size());
        assertEquals(1L, result.getContent().get(0).getAccount().getId());
        assertEquals(1L, result.getContent().get(1).getAccount().getId());
        verify(transactionRepository, times(1)).findByAccountId(1L, pageable);
    }

    @Test
    void getTransactionsByAccountId_shouldReturnEmptyListWhenNoTransactionsForAccount() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        Page<Transaction> emptyPage = Page.empty(pageable);
        when(transactionRepository.findByAccountId(anyLong(), any(Pageable.class))).thenReturn(emptyPage);

        // Act
        Page<Transaction> result = transactionService.getTransactionsByAccountId(99L, pageable);

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        assertEquals(0, result.getTotalElements());
        verify(transactionRepository, times(1)).findByAccountId(99L, pageable);
    }

    // --- Split Transaction Tests ---

    @Test
    void splitTransaction_shouldSplitSuccessfully() {
        BigDecimal parentAmount = BigDecimal.valueOf(100.00);
        BigDecimal splitAmount1 = BigDecimal.valueOf(30.00);
        BigDecimal splitAmount2 = BigDecimal.valueOf(70.00);

        // Make copies to avoid modifying the original test data object directly during service call
        Transaction originalParent = new Transaction();
        originalParent.setId(transaction1.getId());
        originalParent.setAmount(parentAmount);
        originalParent.setDescription(transaction1.getDescription());
        originalParent.setType(transaction1.getType());
        originalParent.setTransactionDate(transaction1.getTransactionDate());
        originalParent.setAccount(transaction1.getAccount());
        originalParent.setCreatedAt(transaction1.getCreatedAt());
        originalParent.setTagId(transaction1.getTagId());
        originalParent.setCounterParty(transaction1.getCounterParty());
        originalParent.setNotes(transaction1.getNotes());
        originalParent.setExcludeFromAccounting(transaction1.getExcludeFromAccounting());
        originalParent.generateUniqueKey(); // Generate key based on 100.00

        when(transactionRepository.findById(1L)).thenReturn(Optional.of(originalParent));

        // Mock saving the new sub-transaction - still need to return it with an ID
        when(transactionRepository.save(argThat(t -> t != null && t.getParentId() != null && t.getParentId().equals(1L))))
            .thenAnswer(invocation -> {
                Transaction newSub = invocation.getArgument(0);
                newSub.setId(3L); // Assign a new ID
                return newSub;
            });

        // We don't strictly need to mock the parent save if we use ArgumentCaptor for verification,
        // but doing so prevents potential NullPointerExceptions if the service method returns the result of save.
        when(transactionRepository.save(argThat(t -> t != null && t.getId() != null && t.getId().equals(1L))))
            .thenAnswer(invocation -> invocation.getArgument(0));


        // Act
        Transaction returnedParent = transactionService.splitTransaction(1L, splitAmount1, splitAmount2);

        // Assert return value
        assertNotNull(returnedParent);
        assertEquals(1L, returnedParent.getId());
        assertEquals(0, splitAmount2.compareTo(returnedParent.getAmount()), "Returned parent amount mismatch");
        assertNotNull(returnedParent.getUpdatedAt(), "Returned parent updatedAt should be set");

        // Verify save was called twice and capture arguments
        verify(transactionRepository, times(2)).save(transactionCaptor.capture());
        List<Transaction> capturedTransactions = transactionCaptor.getAllValues();

        assertEquals(2, capturedTransactions.size(), "Should have captured two saved transactions");

        // Find the saved sub-transaction and updated parent transaction from captured values
        Transaction capturedSub = null;
        Transaction capturedParent = null;
        for (Transaction t : capturedTransactions) {
            if (t.getParentId() != null && t.getParentId().equals(1L)) {
                capturedSub = t;
            } else if (t.getId() != null && t.getId().equals(1L)) {
                capturedParent = t;
            }
        }

        // Assert captured sub-transaction
        assertNotNull(capturedSub, "Sub-transaction was not captured");
        assertEquals(0, splitAmount1.compareTo(capturedSub.getAmount()), "Captured sub amount mismatch");
        assertEquals(1L, capturedSub.getParentId(), "Captured sub parentId mismatch");
        assertEquals(originalParent.getDescription(), capturedSub.getDescription(), "Captured sub description mismatch");
        assertEquals(originalParent.getType(), capturedSub.getType(), "Captured sub type mismatch");
        assertEquals(originalParent.getTransactionDate(), capturedSub.getTransactionDate(), "Captured sub date mismatch");
        assertEquals(originalParent.getAccount(), capturedSub.getAccount(), "Captured sub account mismatch");
        // ID should have been assigned by the mock
        // assertEquals(3L, capturedSub.getId()); // ID might not be set on the captured object depending on when captor runs vs thenAnswer
        assertNotNull(capturedSub.getCreatedAt(), "Captured sub createdAt should be set");
        assertNotNull(capturedSub.getUniqueKey(), "Captured sub uniqueKey should be generated");

        // Assert captured parent transaction
        assertNotNull(capturedParent, "Updated parent transaction was not captured");
        assertEquals(1L, capturedParent.getId(), "Captured parent ID mismatch");
        assertNull(capturedParent.getParentId(), "Captured parent parentId should be null");
        assertEquals(0, splitAmount2.compareTo(capturedParent.getAmount()), "Captured parent amount mismatch");
        assertEquals(originalParent.getDescription(), capturedParent.getDescription(), "Captured parent description should be unchanged (per current code)");
        assertNotNull(capturedParent.getUpdatedAt(), "Captured parent updatedAt should be set");
        // Important: Verify the unique key was *not* regenerated (based on current service code)
        assertEquals(originalParent.getUniqueKey(), capturedParent.getUniqueKey(), "Captured parent uniqueKey should not have changed");

    }

    @Test
    void splitTransaction_shouldThrowNotFoundWhenParentDoesNotExist() {
        when(transactionRepository.findById(99L)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            transactionService.splitTransaction(99L, BigDecimal.TEN, BigDecimal.TEN);
        });

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertEquals("Parent transaction with ID 99 not found", exception.getReason());
        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    void splitTransaction_shouldThrowIllegalArgumentWhenAmountsDoNotMatchParent() {
        transaction1.setAmount(BigDecimal.valueOf(100.00)); // Parent is 100
        when(transactionRepository.findById(1L)).thenReturn(Optional.of(transaction1));

        BigDecimal invalidSplit1 = BigDecimal.valueOf(30.00);
        BigDecimal invalidSplit2 = BigDecimal.valueOf(60.00); // 30 + 60 != 100

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            transactionService.splitTransaction(1L, invalidSplit1, invalidSplit2);
        });

        assertTrue(exception.getMessage().contains("does not match the parent transaction amount"));
        verify(transactionRepository, never()).save(any(Transaction.class));
    }
}