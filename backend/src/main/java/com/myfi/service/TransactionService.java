package com.myfi.service;

import com.myfi.model.Transaction;
import com.myfi.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

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
} 