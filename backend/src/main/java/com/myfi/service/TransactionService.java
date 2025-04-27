package com.myfi.service;

import com.myfi.model.Transaction;
import com.myfi.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.YearMonth;
import java.time.LocalTime;

@Service
public class TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public Page<Transaction> getAllTransactions(Pageable pageable) {
        return transactionRepository.findAllByOrderByTransactionDateDesc(pageable);
    }

    @Transactional(readOnly = true)
    public Optional<Transaction> getTransactionById(Long id) {
        return transactionRepository.findById(id);
    }

    @Transactional
    public Transaction createTransaction(Transaction transaction) {
        // Basic validation or default setting
        if (transaction.getCreatedAt() == null) {
            transaction.setCreatedAt(LocalDateTime.now());
        }
        // Ensure mandatory fields are present (basic check)
        if (transaction.getAmount() == null || transaction.getDescription() == null ||
                transaction.getType() == null || transaction.getTransactionDate() == null) {
            throw new IllegalArgumentException(
                    "Mandatory transaction fields (amount, description, type, transactionDate) must be provided.");
        }

        // Generate the unique key before checking/saving
        try {
            transaction.generateUniqueKey();
        } catch (IllegalStateException e) {
            // Handle cases where key generation fails due to missing fields (though
            // validated above)
            System.err.println("Error generating unique key: " + e.getMessage());
            // Depending on requirements, you might throw a specific exception or return an
            // error indicator
            throw new IllegalArgumentException("Could not generate unique key due to missing transaction fields.", e);
        }

        // Check for duplicate transaction using the unique key
        Optional<Transaction> existingTransaction = transactionRepository.findByUniqueKey(transaction.getUniqueKey());

        if (existingTransaction.isPresent()) {
            // Log or handle duplicate case - returning the existing one
            System.out.println("Duplicate transaction detected (unique key): " + transaction.getUniqueKey());
            return existingTransaction.get();
        }

        // If no duplicate, save the new transaction
        return transactionRepository.save(transaction);
    }

    @Transactional
    public Optional<Transaction> updateTransaction(Long id, Transaction transactionDetails) {
        return transactionRepository.findById(id)
                .map(existingTransaction -> {
                    // Update only non-null fields from transactionDetails
                    if (transactionDetails.getAmount() != null) {
                        existingTransaction.setAmount(transactionDetails.getAmount());
                    }
                    if (transactionDetails.getDescription() != null) {
                        existingTransaction.setDescription(transactionDetails.getDescription());
                    }
                    if (transactionDetails.getType() != null) {
                        existingTransaction.setType(transactionDetails.getType());
                    }
                    if (transactionDetails.getTransactionDate() != null) {
                        existingTransaction.setTransactionDate(transactionDetails.getTransactionDate());
                    }
                    // Update tagId if provided
                    Long newTagId = transactionDetails.getTagId();
                    if (newTagId != null) { // Check if tagId was included in the request at all
                        if (newTagId == -1L) { // -1 signals to remove the tag
                            existingTransaction.setTagId(null);
                        } else { // Otherwise, it's a valid ID to set
                            existingTransaction.setTagId(newTagId);
                        }
                    }
                    
                    if (transactionDetails.getAccount() != null) {
                        existingTransaction.setAccount(transactionDetails.getAccount()); // Consider fetching Account by ID if only ID is passed
                    }
                    if (transactionDetails.getCounterParty() != null) {
                        existingTransaction.setCounterParty(transactionDetails.getCounterParty());
                    }
                    if (transactionDetails.getNotes() != null) {
                        existingTransaction.setNotes(transactionDetails.getNotes());
                    }
                    // Check if the Boolean value is provided and different from the existing one
                    if (transactionDetails.getExcludeFromAccounting() != null && 
                        !transactionDetails.getExcludeFromAccounting().equals(existingTransaction.getExcludeFromAccounting())) { 
                        existingTransaction.setExcludeFromAccounting(transactionDetails.getExcludeFromAccounting());
                    }

                    // Always update the timestamp
                    existingTransaction.setUpdatedAt(LocalDateTime.now());

                    // IMPORTANT:
                    // Don't regenerate unique key
                    // As updating the unique key will result in duplicate transactions
                    // As in case of split transactions, the amount chnaged and the unique key will change                    

                    return transactionRepository.save(existingTransaction);
                });
    }

    @Transactional
    public boolean deleteTransaction(Long id) {
        return transactionRepository.findById(id)
                .map(transaction -> {
                    transactionRepository.delete(transaction);
                    return true;
                }).orElse(false);
    }

    @Transactional(readOnly = true)
    public List<Transaction> getTransactionsByAccountId(Long accountId) {
        return transactionRepository.findByAccountId(accountId, Pageable.unpaged()).getContent();
    }

    @Transactional(readOnly = true)
    public Page<Transaction> getTransactionsByAccountId(Long accountId, Pageable pageable) {
        return transactionRepository.findByAccountId(accountId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Transaction> getTransactionsForCurrentMonth() {
        YearMonth currentYearMonth = YearMonth.now();
        LocalDateTime startOfMonth = currentYearMonth.atDay(1).atStartOfDay();
        LocalDateTime endOfMonth = currentYearMonth.atEndOfMonth().atTime(LocalTime.MAX);
        return transactionRepository.findByTransactionDateBetween(startOfMonth, endOfMonth);
    }

    @Transactional(readOnly = true)
    public List<Transaction> getTransactionsForMonth(int year, int month) {
        // Validate month (1-12)
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("Invalid month: " + month + ". Month must be between 1 and 12.");
        }

        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDateTime startOfMonth = yearMonth.atDay(1).atStartOfDay();
        LocalDateTime endOfMonth = yearMonth.atEndOfMonth().atTime(LocalTime.MAX);
        
        // Assuming findByTransactionDateBetween exists in TransactionRepository
        return transactionRepository.findByTransactionDateBetween(startOfMonth, endOfMonth);
    }

    /**
     * Splits a parent transaction into two specified amounts.
     * Creates one new sub-transaction and updates the parent transaction's amount.
     * Implement the detailed logic for validation, creation, and update here.
     *
     * @param parentId The ID of the transaction to split.
     * @param amount1  Amount for the new sub-transaction.
     * @param amount2  Amount the parent transaction should be updated to.
     * @return The updated parent transaction.
     * @throws IllegalArgumentException If amounts don't match, parent is already
     *                                  split, etc.
     * @throws ResponseStatusException  If the parent transaction is not found.
     */
    @Transactional // Ensure atomicity
    public Transaction splitTransaction(Long parentId, BigDecimal amount1, BigDecimal amount2) {
        // 1. Fetch the parent transaction or throw NotFound
        Transaction parent = transactionRepository.findById(parentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Parent transaction with ID " + parentId + " not found."));

        // Check if parent.getAmount() equals amount1 + amount2
        // This validation remains important: the new split amounts must sum to the
        // *current* parent amount.
        BigDecimal totalSplitAmount = amount1.add(amount2);
        if (parent.getAmount().compareTo(totalSplitAmount) != 0) {
            throw new IllegalArgumentException(
                    String.format(
                            "The sum of split amounts (%.2f + %.2f = %.2f) does not match the parent transaction amount (%.2f).",
                            amount1, amount2, totalSplitAmount, parent.getAmount()));
        }

        // 3. Create the new sub-transaction object:
        Transaction newSubTransaction = new Transaction();
        // Set the parent ID directly
        newSubTransaction.setParentId(parent.getId());
        newSubTransaction.setAccount(parent.getAccount()); // Reference the same account
        newSubTransaction.setAmount(amount1);
        newSubTransaction.setDescription(parent.getDescription()); // Append to description
        newSubTransaction.setType(parent.getType()); // Inherit type
        newSubTransaction.setTransactionDate(parent.getTransactionDate()); // Inherit date
        newSubTransaction.setTagId(parent.getTagId()); // Inherit tagId
        newSubTransaction.setCounterParty(parent.getCounterParty()); // Inherit counterParty
        newSubTransaction.setNotes(parent.getNotes()); // Inherit notes
        // Use the getter for Boolean type
        newSubTransaction.setExcludeFromAccounting(parent.getExcludeFromAccounting()); 
        newSubTransaction.setCreatedAt(LocalDateTime.now());
        // Generate unique key BEFORE saving
        try {
            newSubTransaction.generateUniqueKey();
        } catch (IllegalStateException e) {
            throw new IllegalArgumentException(
                    "Could not generate unique key for new sub-transaction due to missing fields.", e);
        }
        // Optional: Check for duplicates based on the new key if needed
        // Optional<Transaction> duplicateCheck =
        // transactionRepository.findByUniqueKey(newSubTransaction.getUniqueKey());
        // if (duplicateCheck.isPresent()) {
        // throw new IllegalStateException("Generated sub-transaction would be a
        // duplicate.");
        // }

        // Save the new sub-transaction directly
        transactionRepository.save(newSubTransaction);

        // 4. Update the parent transaction:
        parent.setAmount(amount2);
        parent.setDescription(parent.getDescription()); // Update parent description
        parent.setUpdatedAt(LocalDateTime.now());

        // Optional: Add the new sub-transaction to parent's collection if managing
        // bidirectionally and it's loaded
        // if (parent.getSubTransactions() != null) { // Check if collection initialized
        // parent.getSubTransactions().add(createdSubTransaction);
        // }

        // Save the updated parent
        Transaction updatedParent = transactionRepository.save(parent);

        // 5. Return the updated parent transaction (potentially with sub-transactions
        // loaded depending on fetch strategy)
        return updatedParent;
    }

    /**
     * Merges a child transaction back into its parent transaction.
     *
     * @param childId The ID of the child transaction to merge.
     * @return The updated parent transaction.
     * @throws ResponseStatusException If the child or parent transaction is not found.
     * @throws IllegalArgumentException If the transaction with childId is not a child transaction (has no parentId).
     */
    @Transactional
    public Transaction mergeTransaction(Long childId) {
        // 1. Fetch the child transaction
        Transaction child = transactionRepository.findById(childId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Child transaction with ID " + childId + " not found."));

        // 2. Check if it's actually a child
        Long parentId = child.getParentId();
        if (parentId == null) {
            throw new IllegalArgumentException("Transaction with ID " + childId + " is not a child transaction and cannot be merged.");
        }

        // 3. Fetch the parent transaction
        Transaction parent = transactionRepository.findById(parentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Parent transaction with ID " + parentId + " not found for child " + childId + "."));

        // 4. Calculate the new parent amount
        BigDecimal newParentAmount = parent.getAmount().add(child.getAmount());

        // 5. Update the parent transaction
        parent.setAmount(newParentAmount);
        // Restore original description? Maybe add a note?
        // For now, just update amount and timestamp.
        parent.setUpdatedAt(LocalDateTime.now());

        // 6. Delete the child transaction
        transactionRepository.delete(child);

        // 7. Save the updated parent
        Transaction updatedParent = transactionRepository.save(parent);

        // 8. Return the updated parent
        return updatedParent;
    }
}