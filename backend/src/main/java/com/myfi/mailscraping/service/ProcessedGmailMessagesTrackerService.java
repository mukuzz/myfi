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
    public boolean isMessageProcessed(String messageId) {
        return repository.existsByMessageId(messageId);
    }

    @Transactional(readOnly = true)
    public Optional<LocalDateTime> findLatestMessageDateTime() {
        return repository.findTopByOrderByMessageDateTimeDesc()
                         .map(ProcessedGmailMessage::getMessageDateTime);
    }

    @Transactional
    public void saveProcessedMessage(String messageId, LocalDateTime messageDateTime) {
        if (messageId == null || messageId.isBlank()) {
            logger.warn("Attempted to save a null or blank message ID. Skipping.");
            return;
        }
        if (messageDateTime == null) {
            logger.warn("Attempted to save message ID {} with a null message date. Skipping.", messageId);
            return;
        }

        // Double-check existence within the transaction to handle potential race conditions
        if (repository.existsByMessageId(messageId)) {
            logger.debug("Message ID {} already exists. No need to save again.", messageId);
            return;
        }

        ProcessedGmailMessage processedMessage = ProcessedGmailMessage.builder()
                .messageId(messageId)
                .messageDateTime(messageDateTime)
                .processedAt(LocalDateTime.now()) // Set here, @PrePersist will overwrite if needed
                .build();
        try {
            repository.save(processedMessage);
            logger.info("Saved processed message ID: {} with message date: {}", messageId, messageDateTime);
        } catch (DataIntegrityViolationException e) {
            // This might happen in a race condition if another thread/instance saved it between the check and save
            logger.warn("Data integrity violation for message ID {}, likely already saved by another process.", messageId);
        } catch (Exception e) {
            logger.error("Error saving processed message ID {}: {}", messageId, e.getMessage(), e);
            // Depending on requirements, you might want to re-throw a custom exception here
        }
    }
} 