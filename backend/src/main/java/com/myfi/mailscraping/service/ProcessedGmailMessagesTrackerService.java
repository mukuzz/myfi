package com.myfi.mailscraping.service;

import com.myfi.mailscraping.model.ProcessedGmailMessage;
import com.myfi.mailscraping.repository.ProcessedGmailMessageRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class ProcessedGmailMessagesTrackerService {

    private static final Logger logger = LoggerFactory.getLogger(ProcessedGmailMessagesTrackerService.class);

    @Autowired
    private ProcessedGmailMessageRepository repository;

    @Transactional(readOnly = true)
    public boolean isMessageProcessed(String messageId, String accountNumber) {
        return repository.existsByMessageIdAndAccountNumber(messageId, accountNumber);
    }

    @Transactional(readOnly = true)
    public Optional<LocalDateTime> findLatestMessageDateTime(String accountNumber) {
        return repository.findTopByAccountNumberOrderByMessageDateTimeDesc(accountNumber)
                         .map(ProcessedGmailMessage::getMessageDateTime);
    }

    @Transactional
    public void saveProcessedMessage(String messageId, String accountNumber, LocalDateTime messageDateTime) {
        if (messageId == null || messageId.isBlank()) {
            logger.warn("Attempted to save a null or blank message ID. Skipping.");
            return;
        }
        if (accountNumber == null || accountNumber.isBlank()) {
            logger.warn("Attempted to save message ID {} with a null or blank account number. Skipping.", messageId);
            return;
        }
        if (messageDateTime == null) {
            logger.warn("Attempted to save message ID {} for account {} with a null message date. Skipping.", messageId, accountNumber);
            return;
        }

        // Double-check existence within the transaction to handle potential race conditions
        if (repository.existsByMessageIdAndAccountNumber(messageId, accountNumber)) {
            logger.debug("Message ID {} for account {} already exists. No need to save again.", messageId, accountNumber);
            return;
        }

        ProcessedGmailMessage processedMessage = ProcessedGmailMessage.builder()
                .messageId(messageId)
                .accountNumber(accountNumber)
                .messageDateTime(messageDateTime)
                .processedAt(LocalDateTime.now()) // Set here, @PrePersist will overwrite if needed
                .build();
        try {
            repository.save(processedMessage);
            logger.info("Saved processed message ID: {} for account {} with message date: {}", messageId, accountNumber, messageDateTime);
        } catch (DataIntegrityViolationException e) {
            // This might happen in a race condition if another thread/instance saved it between the check and save
            logger.warn("Data integrity violation for message ID {} and account {}, likely already saved by another process.", messageId, accountNumber);
        } catch (Exception e) {
            logger.error("Error saving processed message ID {} for account {}: {}", messageId, accountNumber, e.getMessage(), e);
            // Depending on requirements, you might want to re-throw a custom exception here
        }
    }
} 