package com.myfi.mailscraping.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;

import com.myfi.mailscraping.constants.Constants;

import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.myfi.model.Account;
import com.myfi.model.Transaction;
import com.myfi.service.AccountService;
import com.myfi.service.TransactionService;
import com.myfi.mailscraping.service.OpenAIService.ExtractedTransactionDetails;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class GmailService {

    private static final Logger logger = LoggerFactory.getLogger(GmailService.class);
    private static final String APPLICATION_NAME = "MyFi";
    private static final String USER_ID = "me"; // Represents the authenticated user

    @Autowired
    private GoogleAuthService googleAuthService;

    @Autowired
    private HttpTransport httpTransport;

    @Autowired
    private JsonFactory jsonFactory;

    @Autowired
    private OpenAIService openAIService;

    @Autowired
    private EmailParser emailParser;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private ProcessedGmailMessagesTrackerService processedGmailMessagesTrackerService;

    /**
     * Fetches emails based on a query and processes them (currently logs info).
     *
     * @return A list of message IDs that were found (can be expanded later).
     * @throws IOException           If there is an issue communicating with the
     *                               Gmail API or authentication fails.
     * @throws IllegalStateException If authentication credentials are not
     *                               available.
     */
    public List<String> syncAndProcessEmails() throws IOException {
        List<String> successfullyProcessedMessageIds = new ArrayList<>();
        try {
            Credential credential = googleAuthService.getCredentials();
            Gmail service = new Gmail.Builder(httpTransport, jsonFactory, credential)
                    .setApplicationName(APPLICATION_NAME)
                    .build();

            // Base query
            StringBuilder queryBuilder = new StringBuilder("from:{");
            boolean firstEmail = true;
            // Iterate through all supported email lists
            for (List<String> emailList : Constants.SUPPORTED_BANK_EMAILS.values()) {
                // Iterate through emails in the current list
                for (String email : emailList) {
                    if (!firstEmail) {
                        queryBuilder.append(" "); // Add space separator before the next email
                    }
                    queryBuilder.append(email);
                    firstEmail = false; // Mark that we've added at least one email
                }
            }
            queryBuilder.append("}"); // Close the curly brace for 'from'

            // Find the latest processed message date
            Optional<LocalDateTime> latestDateTimeOpt = processedGmailMessagesTrackerService.findLatestMessageDateTime();

            if (latestDateTimeOpt.isPresent()) {
                LocalDateTime latestDateTime = latestDateTimeOpt.get();
                long secondsSinceEpoch = latestDateTime.toEpochSecond(ZoneOffset.UTC);
                secondsSinceEpoch = secondsSinceEpoch - 1;
                queryBuilder.append(" after:").append(secondsSinceEpoch);
                logger.info("Found last processed message date: {}. Querying for messages after this time.", latestDateTime);
            } else {
                // Calculate the date 3 months ago
                LocalDateTime threeMonthsAgo = LocalDateTime.now(ZoneOffset.UTC).minusMonths(3);
                long secondsSinceEpoch3MonthsAgo = threeMonthsAgo.toEpochSecond(ZoneOffset.UTC);
                queryBuilder.append(" after:").append(secondsSinceEpoch3MonthsAgo);
                logger.info("No processed messages found in DB. Querying for messages in the last 3 months (after {}).", threeMonthsAgo);
            }

            String finalQuery = queryBuilder.toString();
            logger.info("Executing Gmail search query: [{}]", finalQuery);

            ListMessagesResponse response = service.users().messages().list(USER_ID).setQ(finalQuery).execute();
            List<Message> messages = response.getMessages();

            if (messages == null || messages.isEmpty()) {
                logger.info("No emails found matching the query.");
                return successfullyProcessedMessageIds;
            }

            logger.info("Found {} emails matching the query.", messages.size());

            for (Message message : messages) {
                String messageId = message.getId();
                boolean needsProcessing = true;
                boolean savedSuccessfully = false;
                LocalDateTime messageDateTime = null;

                if (processedGmailMessagesTrackerService.isMessageProcessed(messageId)) {
                    logger.info("Skipping already processed message ID: {}", messageId);
                    needsProcessing = false;
                } else {
                    logger.info("Processing message ID: {}", messageId);
                }

                if (needsProcessing) {
                    try {
                        Message fullMessage = service.users().messages().get(USER_ID, messageId).setFormat("full")
                                .execute(); // Use "full" format

                        // Extract message date *before* potential processing errors
                        if (fullMessage.getInternalDate() != null) {
                            messageDateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(fullMessage.getInternalDate()), ZoneOffset.UTC);
                        }

                        String cleanTextBody = emailParser.extractTextFromMessage(fullMessage);

                        if (cleanTextBody != null && !cleanTextBody.isBlank()) {
                            Optional<ExtractedTransactionDetails> extractedTransactionDetails = openAIService
                                    .extractTransactionDetailsFromEmail(cleanTextBody);

                            if (extractedTransactionDetails.isPresent()) {
                                ExtractedTransactionDetails details = extractedTransactionDetails.get();
                                Transaction transaction = mapExtractedTransactionDetailsToTransaction(details);
                                try {
                                    if (transaction != null) {
                                        Transaction savedTransaction = transactionService
                                                .createTransaction(transaction);
                                        logger.info("Saved transaction with ID: {} for message ID: {}",
                                                savedTransaction.getId(), messageId);
                                        savedSuccessfully = true;
                                    } else {
                                        logger.warn("Mapped transaction was null for message ID: {}, skipping save.",
                                                messageId);
                                    }
                                } catch (IllegalArgumentException e) {
                                    logger.warn(
                                            "Failed to save transaction (likely duplicate or validation error) for message ID {}: {}",
                                            messageId, e.getMessage());
                                } catch (Exception e) {
                                    logger.error("Error saving transaction for message ID {}: {}", messageId,
                                            e.getMessage(), e);
                                }
                            } else {
                                logger.warn("Could not extract transaction details from message ID: {}", messageId);
                            }

                        } else {
                            logger.warn("Could not extract clean text body using EmailParser for message ID: {}",
                                    messageId);
                        }

                    } catch (IOException e) {
                        logger.error("IOException fetching/processing full message ID {}: {}", messageId,
                                e.getMessage(),
                                e);
                    } catch (Exception e) {
                        logger.error("Unexpected error processing message ID {}: {}", messageId, e.getMessage(), e);
                    } finally {
                        // Save with the extracted or fallback message date
                        processedGmailMessagesTrackerService.saveProcessedMessage(messageId, messageDateTime);
                        if (savedSuccessfully) {
                            successfullyProcessedMessageIds.add(messageId);
                        }
                    }
                }
            }

            return successfullyProcessedMessageIds;

        } catch (IllegalStateException e) {
            logger.error("Cannot sync emails: {}", e.getMessage());
            throw e;
        } catch (IOException e) {
            logger.error("IOException during Gmail sync: {}", e.getMessage(), e);
            throw e;
        }
    }

    private Transaction mapExtractedTransactionDetailsToTransaction(ExtractedTransactionDetails details) {
        if (StringUtils.isBlank(details.getCardNumber()) || details.getCardNumber().length() < 4) {
            logger.warn("Card number is blank or too short for transaction: {}", details);
            return null;
        }
        Account account = accountService.getAccountByCardLast4DigitsNumber(
                details.getCardNumber().substring(details.getCardNumber().length() - 4));
        if (account == null) {
            logger.warn("Could not find account for card number: {}, for transaction: {}", details.getCardNumber(),
                    details);
            return null;
        }

        Transaction transaction = Transaction.builder()
                .amount(BigDecimal.valueOf(details.getAmount()))
                .description(details.getDescription())
                .type(Transaction.TransactionType.valueOf(details.getType()))
                .transactionDate(details.getTransactionDate().atStartOfDay())
                .createdAt(LocalDateTime.now())
                .account(account)
                .build();

        return transaction;
    }
}