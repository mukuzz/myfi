package com.myfi.repository;

import com.myfi.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByTransactionDateBetween(LocalDateTime start, LocalDateTime end);
    List<Transaction> findByType(Transaction.TransactionType type);
    List<Transaction> findByCategory(String category);
    List<Transaction> findByAccountId(Long accountId);

    // Method to find by the generated unique key
    Optional<Transaction> findByUniqueKey(String uniqueKey);
} 