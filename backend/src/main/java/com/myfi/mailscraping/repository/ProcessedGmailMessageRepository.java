package com.myfi.mailscraping.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.myfi.mailscraping.model.ProcessedGmailMessage;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

@Repository
public interface ProcessedGmailMessageRepository extends JpaRepository<ProcessedGmailMessage, Long> {

    // New methods for global email tracking
    boolean existsByMessageId(String messageId);
    
    Optional<ProcessedGmailMessage> findByMessageId(String messageId);

    // Check if a message was processed for a specific account
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM ProcessedGmailMessage p " +
           "WHERE p.messageId = :messageId AND :accountNumber MEMBER OF p.processedAccountNumbers")
    boolean isMessageProcessedForAccount(@Param("messageId") String messageId, @Param("accountNumber") String accountNumber);

    // Find the latest message date for any account
    @Query("SELECT MAX(p.messageDateTime) FROM ProcessedGmailMessage p")
    Optional<LocalDateTime> findLatestMessageDateTime();

    // Find the latest message date considering account numbers in the processed accounts set
    @Query("SELECT MAX(p.messageDateTime) FROM ProcessedGmailMessage p " +
           "WHERE :accountNumber MEMBER OF p.processedAccountNumbers")
    Optional<LocalDateTime> findLatestMessageDateTimeForAccount(@Param("accountNumber") String accountNumber);

    // Find messages that haven't been processed for specific accounts
    @Query("SELECT p FROM ProcessedGmailMessage p WHERE p.messageId = :messageId " +
           "AND NOT (:accountNumber MEMBER OF p.processedAccountNumbers)")
    Optional<ProcessedGmailMessage> findUnprocessedMessageForAccount(@Param("messageId") String messageId, 
                                                                    @Param("accountNumber") String accountNumber);

    // Legacy methods for backward compatibility (deprecated)
    @Deprecated
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM ProcessedGmailMessage p " +
           "WHERE p.messageId = :messageId AND :accountNumber MEMBER OF p.processedAccountNumbers")
    boolean existsByMessageIdAndAccountNumber(@Param("messageId") String messageId, @Param("accountNumber") String accountNumber);

    @Deprecated
    @Query("SELECT p FROM ProcessedGmailMessage p " +
           "WHERE :accountNumber MEMBER OF p.processedAccountNumbers " +
           "ORDER BY p.messageDateTime DESC")
    Optional<ProcessedGmailMessage> findTopByAccountNumberOrderByMessageDateTimeDesc(@Param("accountNumber") String accountNumber);
} 