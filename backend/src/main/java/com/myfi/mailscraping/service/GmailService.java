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
import com.myfi.refreshTracker.enums.RefreshJobStatus;
import com.myfi.refreshTracker.enums.RefreshType;
import com.myfi.refreshTracker.service.RefreshTrackingService;
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
import java.util.UUID;

@Service
public class GmailService {

    private static final Logger logger = LoggerFactory.getLogger(GmailService.class);
    private static final String APPLICATION_NAME = "MyFi";
    private static final String USER_ID = "me";
    private static final String GMAIL_SYNC_OPERATION_ID_PREFIX = "GMAIL_SYNC_OP_";

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

    @Autowired
    private RefreshTrackingService refreshTrackingService;

    public List<String> syncAndProcessEmails() throws IOException {
        // Generate a unique ID for this specific sync operation instance
        String operationId = GMAIL_SYNC_OPERATION_ID_PREFIX + UUID.randomUUID().toString();
        refreshTrackingService.clearProgressForType(RefreshType.GMAIL_SYNC);
        refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Gmail Sync", Optional.empty());

        List<String> successfullyProcessedMessageIds = new ArrayList<>();
        int processedInThisRun = 0;

        try {
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.LOGIN_STARTED, "Authenticating with Google.");
            Credential credential = googleAuthService.getCredentials(); // Throws IllegalStateException if auth fails
            Gmail service = new Gmail.Builder(httpTransport, jsonFactory, credential)
                    .setApplicationName(APPLICATION_NAME)
                    .build();
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.LOGIN_SUCCESS, "Google authentication successful.");

            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_STARTED, "Fetching emails from Gmail.");

            StringBuilder queryBuilder = new StringBuilder("from:{");
            boolean firstEmail = true;
            for (List<String> emailList : Constants.CC_SUPPORTED_BANK_EMAILS.values()) {
                for (String email : emailList) {
                    if (!firstEmail) queryBuilder.append(" ");
                    queryBuilder.append(email);
                    firstEmail = false;
                }
            }
            queryBuilder.append("}");

            Optional<LocalDateTime> latestDateTimeOpt = processedGmailMessagesTrackerService.findLatestMessageDateTime();
            if (latestDateTimeOpt.isPresent()) {
                long secondsSinceEpoch = latestDateTimeOpt.get().toEpochSecond(ZoneOffset.UTC) - 1;
                queryBuilder.append(" after:").append(secondsSinceEpoch);
            } else {
                queryBuilder.append(" after:").append(LocalDateTime.now(ZoneOffset.UTC).minusMonths(3).toEpochSecond(ZoneOffset.UTC));
            }
            String finalQuery = queryBuilder.toString();
            logger.info("Executing Gmail search query: [{}]", finalQuery);

            ListMessagesResponse response = service.users().messages().list(USER_ID).setQ(finalQuery).execute();
            List<Message> messages = response.getMessages();

            if (messages == null || messages.isEmpty()) {
                logger.info("No new emails found matching the query.");
                refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, operationId, "No new emails found.");
                return successfullyProcessedMessageIds;
            }

            logger.info("Found {} emails matching the query.", messages.size());
            refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId, 
                RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processing found emails.", 0, Optional.of(messages.size()));
            
            int totalMessagesToProcess = messages.size();

            for (Message messageSummary : messages) {
                String messageId = messageSummary.getId();
                boolean savedSuccessfullyCurrentMessage = false;
                LocalDateTime messageDateTime = null;

                if (processedGmailMessagesTrackerService.isMessageProcessed(messageId)) {
                    logger.info("Skipping already processed message ID: {}", messageId);
                    // Potentially decrement totalMessagesToProcess if we consider these as "not to be processed in this run"
                    // For now, itemsTotal remains fixed from initial fetch, itemsProcessed counts actual attempts.
                } else {
                    logger.info("Processing message ID: {}", messageId);
                    try {
                        Message fullMessage = service.users().messages().get(USER_ID, messageId).setFormat("full").execute();
                        if (fullMessage.getInternalDate() != null) {
                            messageDateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(fullMessage.getInternalDate()), ZoneOffset.UTC);
                        }

                        String cleanTextBody = emailParser.extractTextFromMessage(fullMessage);
                        if (StringUtils.isNotBlank(cleanTextBody)) {
                            Optional<ExtractedTransactionDetails> extractedDetails = openAIService.extractTransactionDetailsFromEmail(cleanTextBody);
                            if (extractedDetails.isPresent()) {
                                Transaction transaction = mapExtractedTransactionDetailsToTransaction(messageId, extractedDetails.get());
                                if (transaction != null) {
                                    try {
                                        Transaction savedTransaction = transactionService.createTransaction(transaction);
                                        logger.info("Saved transaction with ID: {} for message ID: {}", savedTransaction.getId(), messageId);
                                        savedSuccessfullyCurrentMessage = true;
                                    } catch (IllegalArgumentException e) {
                                        logger.warn("Failed to save transaction (duplicate/validation) for message ID {}: {}", messageId, e.getMessage());
                                    } catch (Exception e) {
                                        logger.error("Error saving transaction for message ID {}: {}", messageId, e.getMessage(), e);
                                    }
                                }
                            } else {
                                logger.warn("Could not extract transaction details from message ID: {}", messageId);
                            }
                        } else {
                            logger.warn("Could not extract clean text body for message ID: {}", messageId);
                        }
                    } catch (IOException e) {
                        logger.error("IOException fetching/processing full message ID {}: {}", messageId, e.getMessage(), e);
                        // Do not fail the entire batch for one message, but log it.
                    } catch (Exception e) {
                        logger.error("Unexpected error processing message ID {}: {}", messageId, e.getMessage(), e);
                    } finally {
                        processedGmailMessagesTrackerService.saveProcessedMessage(messageId, messageDateTime);
                        if (savedSuccessfullyCurrentMessage) {
                            successfullyProcessedMessageIds.add(messageId);
                        }
                    }
                }
                processedInThisRun++;
                refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId, 
                    RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processed email " + processedInThisRun + "/" + totalMessagesToProcess, 
                    processedInThisRun, Optional.of(totalMessagesToProcess));
            }

            String completionMessage = String.format("Gmail sync completed. Processed %d messages, found %d transactions.", totalMessagesToProcess, successfullyProcessedMessageIds.size());
            logger.info(completionMessage);
            refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, operationId, completionMessage);
            return successfullyProcessedMessageIds;

        } catch (IllegalStateException e) { // Auth error from getCredentials()
            logger.error("Gmail sync failed: Authentication required.", e);
            refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, operationId, "Authentication required: " + e.getMessage());
            throw e; // Re-throw for controller to handle HTTP status
        } catch (IOException e) { // API error from Gmail communication
            logger.error("Gmail sync failed due to API error.", e);
            refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, operationId, "Gmail API communication error: " + e.getMessage());
            throw e; // Re-throw
        } catch (Exception e) { // Other unexpected errors
            logger.error("An unexpected error occurred during Gmail sync.", e);
            refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, operationId, "Unexpected error during sync: " + e.getMessage());
            throw e; // Re-throw
        }
    }

    private Transaction mapExtractedTransactionDetailsToTransaction(String messageId, ExtractedTransactionDetails details) {
        if (!details.isTransactionSuccessful()) {
            logger.info("Skipping transaction as it's not successful: {}", details);
            return null;
        }
        if (!details.isPixelCardTransaction() && (StringUtils.isBlank(details.getCardNumber()) || details.getCardNumber().length() < 4)) {
            logger.warn("Card number blank or too short: {}", details);
            return null;
        }
        if (details.isCreditCardStatement() || !details.isCreditCardTransaction()) {
            logger.info("Skipping as not a credit card transaction: {}", details);
            return null;
        }
        Account account;
        if (details.isPixelCardTransaction()) {
            account = accountService.getAccountByTypeAndName(Account.AccountType.CREDIT_CARD, Constants.HDFC_PIXEL);
            if (account == null) {
                logger.warn("Pixel card account not found for transaction: {}", details);
                return null;
            }
        } else {
            account = accountService.getAccountByCardLast4DigitsNumber(details.getCardNumber().substring(details.getCardNumber().length() - 4));
            if (account == null) {
                logger.warn("Account for card number not found: {}, transaction: {}", details.getCardNumber(), details);
                return null;
            }
        }
        if (!Constants.CC_SUPPORTED_BANK_EMAILS.keySet().contains(account.getName())) {
            logger.info("Account not supported by email scraper: {}", details);
            return null;
        }
        return Transaction.builder()
                .amount(BigDecimal.valueOf(details.getAmount()))
                .description("Email Message ID: " + messageId)
                .counterParty(details.getDescription())
                .type(Transaction.TransactionType.valueOf(details.getType()))
                .transactionDate(details.getTransactionDate().atStartOfDay())
                .createdAt(LocalDateTime.now())
                .account(account)
                .build();
    }
}