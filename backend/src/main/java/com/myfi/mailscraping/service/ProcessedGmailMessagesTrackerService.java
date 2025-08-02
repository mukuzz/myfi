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
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
public class ProcessedGmailMessagesTrackerService {

    private static final Logger logger = LoggerFactory.getLogger(ProcessedGmailMessagesTrackerService.class);

    @Autowired
    private ProcessedGmailMessageRepository repository;

    /**
     * Checks if an email has been processed globally (for any account).
     */
    @Transactional(readOnly = true)
    public boolean isEmailProcessed(String messageId) {
        return repository.existsByMessageId(messageId);
    }

    /**
     * Checks if an email has been processed for a specific account.
     */
    @Transactional(readOnly = true)
    public boolean isMessageProcessedForAccount(String messageId, String accountNumber) {
        return repository.isMessageProcessedForAccount(messageId, accountNumber);
    }

    /**
     * Gets the set of account numbers that haven't been processed for a given email.
     */
    @Transactional(readOnly = true)
    public Set<String> getUnprocessedAccountsForEmail(String messageId, Set<String> allAccountNumbers) {
        Optional<ProcessedGmailMessage> processedMessage = repository.findByMessageId(messageId);
        
        if (processedMessage.isEmpty()) {
            // Email hasn't been processed at all, return all accounts
            return new HashSet<>(allAccountNumbers);
        }

        Set<String> processedAccounts = processedMessage.get().getProcessedAccountNumbers();
        Set<String> unprocessedAccounts = new HashSet<>(allAccountNumbers);
        unprocessedAccounts.removeAll(processedAccounts);
        
        return unprocessedAccounts;
    }

    /**
     * Finds the latest message date considering all processed messages.
     */
    @Transactional(readOnly = true)
    public Optional<LocalDateTime> findLatestMessageDateTime() {
        return repository.findLatestMessageDateTime();
    }

    /**
     * Finds the latest message date for a specific account.
     */
    @Transactional(readOnly = true)
    public Optional<LocalDateTime> findLatestMessageDateTimeForAccount(String accountNumber) {
        return repository.findLatestMessageDateTimeForAccount(accountNumber);
    }

    /**
     * Marks an email as processed for specific accounts.
     * Creates a new record if the email hasn't been processed before,
     * or updates the existing record to include the new accounts.
     */
    @Transactional
    public void markEmailProcessedForAccounts(String messageId, Set<String> accountNumbers, 
                                            LocalDateTime messageDateTime, int transactionCount) {
        if (messageId == null || messageId.isBlank()) {
            logger.warn("Attempted to save a null or blank message ID. Skipping.");
            return;
        }
        if (accountNumbers == null || accountNumbers.isEmpty()) {
            logger.warn("Attempted to save message ID {} with no account numbers. Skipping.", messageId);
            return;
        }
        if (messageDateTime == null) {
            logger.warn("Attempted to save message ID {} with a null message date. Skipping.", messageId);
            return;
        }

        try {
            Optional<ProcessedGmailMessage> existingMessage = repository.findByMessageId(messageId);
            
            if (existingMessage.isPresent()) {
                // Update existing record
                ProcessedGmailMessage processedMessage = existingMessage.get();
                
                Set<String> currentAccounts = processedMessage.getProcessedAccountNumbers();
                Set<String> newAccounts = new HashSet<>(accountNumbers);
                newAccounts.removeAll(currentAccounts); // Only add accounts that aren't already processed
                
                if (!newAccounts.isEmpty()) {
                    processedMessage.addProcessedAccounts(newAccounts);
                    processedMessage.setTransactionCount(processedMessage.getTransactionCount() + transactionCount);
                    
                    repository.save(processedMessage);
                    logger.info("Updated message ID: {} with {} new accounts. Total accounts: {}, Total transactions: {}", 
                        messageId, newAccounts.size(), processedMessage.getProcessedAccountsCount(), 
                        processedMessage.getTransactionCount());
                } else {
                    logger.debug("All accounts already processed for message ID: {}", messageId);
                }
            } else {
                // Create new record
                ProcessedGmailMessage processedMessage = ProcessedGmailMessage.builder()
                        .messageId(messageId)
                        .processedAccountNumbers(new HashSet<>(accountNumbers))
                        .messageDateTime(messageDateTime)
                        .firstProcessedAt(LocalDateTime.now())
                        .lastProcessedAt(LocalDateTime.now())
                        .transactionCount(transactionCount)
                        .build();
                        
                repository.save(processedMessage);
                logger.info("Created new processed message record for ID: {} with {} accounts and {} transactions", 
                    messageId, accountNumbers.size(), transactionCount);
            }
        } catch (DataIntegrityViolationException e) {
            logger.warn("Data integrity violation for message ID {}, likely race condition. Retrying...", messageId);
            // Retry once in case of race condition
            try {
                Optional<ProcessedGmailMessage> existingMessage = repository.findByMessageId(messageId);
                if (existingMessage.isPresent()) {
                    ProcessedGmailMessage processedMessage = existingMessage.get();
                    processedMessage.addProcessedAccounts(accountNumbers);
                    processedMessage.setTransactionCount(processedMessage.getTransactionCount() + transactionCount);
                    repository.save(processedMessage);
                    logger.info("Retry successful for message ID: {}", messageId);
                }
            } catch (Exception retryException) {
                logger.error("Retry failed for message ID {}: {}", messageId, retryException.getMessage());
            }
        } catch (Exception e) {
            logger.error("Error saving processed message ID {} for accounts {}: {}", messageId, accountNumbers, e.getMessage(), e);
        }
    }

    /**
     * Convenience method to mark email as processed for a single account.
     */
    @Transactional
    public void markEmailProcessedForAccount(String messageId, String accountNumber, 
                                           LocalDateTime messageDateTime, int transactionCount) {
        markEmailProcessedForAccounts(messageId, Set.of(accountNumber), messageDateTime, transactionCount);
    }

    @Transactional
    public void unmarkEmailProcessed(String messageId, String accountNumber) {
        if (messageId == null || messageId.isBlank() || accountNumber == null || accountNumber.isBlank()) {
            logger.warn("Attempted to unmark with a null or blank message ID or account number. Skipping.");
            return;
        }

        Optional<ProcessedGmailMessage> existingMessageOpt = repository.findByMessageId(messageId);
        if (existingMessageOpt.isPresent()) {
            ProcessedGmailMessage existingMessage = existingMessageOpt.get();
            if (existingMessage.getProcessedAccountNumbers().contains(accountNumber)) {
                existingMessage.getProcessedAccountNumbers().remove(accountNumber);
                if (existingMessage.getProcessedAccountNumbers().isEmpty()) {
                    // If no accounts are left, delete the whole record
                    repository.delete(existingMessage);
                    logger.info("Removed last account from message ID: {}. Deleting record.", messageId);
                } else {
                    repository.save(existingMessage);
                    logger.info("Unmarked account {} for message ID: {}", accountNumber, messageId);
                }
            }
        } else {
            logger.warn("Attempted to unmark a message ID that was not tracked: {}", messageId);
        }
    }

    // Legacy methods for backward compatibility (deprecated but still functional)
    @Deprecated
    @Transactional(readOnly = true)
    public boolean isMessageProcessed(String messageId, String accountNumber) {
        return isMessageProcessedForAccount(messageId, accountNumber);
    }

    @Deprecated
    @Transactional(readOnly = true)
    public Optional<LocalDateTime> findLatestMessageDateTime(String accountNumber) {
        return findLatestMessageDateTimeForAccount(accountNumber);
    }

    @Deprecated
    @Transactional
    public void saveProcessedMessage(String messageId, String accountNumber, LocalDateTime messageDateTime) {
        markEmailProcessedForAccount(messageId, accountNumber, messageDateTime, 0);
    }
} 