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
import java.math.RoundingMode; // For validation check

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAll();
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
            throw new IllegalArgumentException("Mandatory transaction fields (amount, description, type, transactionDate) must be provided.");
        }
        // AccountId is mandatory
        if (transaction.getAccount() == null || transaction.getAccount().getId() == null) {
            throw new IllegalArgumentException("AccountId must be provided for a transaction.");
        }

        // Generate the unique key before checking/saving
        try {
            transaction.generateUniqueKey();
        } catch (IllegalStateException e) {
            // Handle cases where key generation fails due to missing fields (though validated above)
            System.err.println("Error generating unique key: " + e.getMessage());
            // Depending on requirements, you might throw a specific exception or return an error indicator
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
                    existingTransaction.setAmount(transactionDetails.getAmount());
                    existingTransaction.setDescription(transactionDetails.getDescription());
                    existingTransaction.setType(transactionDetails.getType());
                    existingTransaction.setTransactionDate(transactionDetails.getTransactionDate());
                    existingTransaction.setTagId(transactionDetails.getTagId());
                    existingTransaction.setAccount(transactionDetails.getAccount()); // Allow updating account linkage
                    existingTransaction.setCounterParty(transactionDetails.getCounterParty()); // Update counterParty
                    existingTransaction.setNotes(transactionDetails.getNotes()); // Update notes
                    existingTransaction.setExcludeFromAccounting(transactionDetails.isExcludeFromAccounting()); // Update excludeFromAccounting
                    // Add other updatable fields as needed
                    existingTransaction.setUpdatedAt(LocalDateTime.now());

                    // Regenerate unique key after updates
                    try {
                        existingTransaction.generateUniqueKey();
                    } catch (IllegalStateException e) {
                        // Handle cases where key generation fails due to missing fields
                        // This might indicate a data integrity issue if mandatory fields become null during update
                        System.err.println("Error regenerating unique key during update: " + e.getMessage());
                        // Depending on requirements, you might throw an exception
                        throw new RuntimeException("Failed to regenerate unique key during transaction update.", e);
                    }

                    // Optional: Re-check for duplicates based on the new key if strict uniqueness after update is required
                    // Optional<Transaction> duplicateCheck = transactionRepository.findByUniqueKey(existingTransaction.getUniqueKey());
                    // if (duplicateCheck.isPresent() && !duplicateCheck.get().getId().equals(existingTransaction.getId())) {
                    //     throw new IllegalStateException("Update would result in a duplicate transaction.");
                    // }

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
        return transactionRepository.findByAccountId(accountId);
    }

    /**
     * Splits a parent transaction into two specified amounts.
     * Creates one new sub-transaction and updates the parent transaction's amount.
     * Implement the detailed logic for validation, creation, and update here.
     *
     * @param parentId The ID of the transaction to split.
     * @param amount1 Amount for the new sub-transaction.
     * @param amount2 Amount the parent transaction should be updated to.
     * @return The updated parent transaction.
     * @throws IllegalArgumentException If amounts don't match, parent is already split, etc.
     * @throws ResponseStatusException If the parent transaction is not found.
     */
    @Transactional // Ensure atomicity
    public Transaction splitTransaction(Long parentId, BigDecimal amount1, BigDecimal amount2) {
        // 1. Fetch the parent transaction or throw NotFound
        Transaction parent = transactionRepository.findById(parentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent transaction with ID " + parentId + " not found."));

        // Check if parent.getAmount() equals amount1 + amount2
        // This validation remains important: the new split amounts must sum to the *current* parent amount.
        BigDecimal totalSplitAmount = amount1.add(amount2);
        if (parent.getAmount().compareTo(totalSplitAmount) != 0) {
            throw new IllegalArgumentException(
                String.format("The sum of split amounts (%.2f + %.2f = %.2f) does not match the parent transaction amount (%.2f).",
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
        newSubTransaction.setExcludeFromAccounting(parent.isExcludeFromAccounting()); // Inherit exclude flag
        newSubTransaction.setCreatedAt(LocalDateTime.now());
        // Generate unique key BEFORE saving
        try {
            newSubTransaction.generateUniqueKey();
        } catch (IllegalStateException e) {
            throw new IllegalArgumentException("Could not generate unique key for new sub-transaction due to missing fields.", e);
        }
        // Optional: Check for duplicates based on the new key if needed
        // Optional<Transaction> duplicateCheck = transactionRepository.findByUniqueKey(newSubTransaction.getUniqueKey());
        // if (duplicateCheck.isPresent()) {
        //     throw new IllegalStateException("Generated sub-transaction would be a duplicate.");
        // }

        // Save the new sub-transaction directly
        transactionRepository.save(newSubTransaction);

        // 4. Update the parent transaction:
        parent.setAmount(amount2);
        parent.setDescription(parent.getDescription()); // Update parent description
        parent.setUpdatedAt(LocalDateTime.now());
        // Regenerate unique key AFTER updates but BEFORE saving - REMOVED as requested
        /*
        try {
            parent.generateUniqueKey();
        } catch (IllegalStateException e) {
            throw new RuntimeException("Failed to regenerate unique key for parent transaction during split.", e);
        }
        */

        // Optional: Add the new sub-transaction to parent's collection if managing bidirectionally and it's loaded
        // if (parent.getSubTransactions() != null) { // Check if collection initialized
        //     parent.getSubTransactions().add(createdSubTransaction);
        // }

        // Save the updated parent
        Transaction updatedParent = transactionRepository.save(parent);

        // 5. Return the updated parent transaction (potentially with sub-transactions loaded depending on fetch strategy)
        return updatedParent;
    }
} 