package com.myfi.mailscraping.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.myfi.mailscraping.model.ProcessedGmailMessage;
import java.util.Optional;

@Repository
public interface ProcessedGmailMessageRepository extends JpaRepository<ProcessedGmailMessage, Long> {

    boolean existsByMessageIdAndAccountNumber(String messageId, String accountNumber);

    // Find the entry with the maximum messageDate for a given account
    Optional<ProcessedGmailMessage> findTopByAccountNumberOrderByMessageDateTimeDesc(String accountNumber);
} 