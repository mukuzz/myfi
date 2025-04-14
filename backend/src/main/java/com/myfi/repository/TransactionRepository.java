package com.myfi.repository;

import com.myfi.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByTransactionDateBetween(LocalDateTime start, LocalDateTime end);
    List<Transaction> findByType(Transaction.TransactionType type);
    List<Transaction> findByTagId(Long tagId);
    Page<Transaction> findByAccountId(Long accountId, Pageable pageable);

    // Method to find by the generated unique key
    Optional<Transaction> findByUniqueKey(String uniqueKey);

    // Added method to find all transactions ordered by date descending with pagination
    Page<Transaction> findAllByOrderByTransactionDateDesc(Pageable pageable);
} 