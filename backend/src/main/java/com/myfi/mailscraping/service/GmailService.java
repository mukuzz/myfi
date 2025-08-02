package com.myfi.mailscraping.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.myfi.mailscraping.constants.Constants;
import com.myfi.mailscraping.enums.EmailType;

import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.myfi.model.Account;
import com.myfi.model.Transaction;
import com.myfi.refresh.enums.RefreshJobStatus;
import com.myfi.refresh.enums.RefreshType;
import com.myfi.refresh.service.RefreshTrackingService;
import com.myfi.service.AccountHistoryService;
import com.myfi.service.AccountService;
import com.myfi.service.SystemStatusService;
import com.myfi.service.TransactionService;
import com.myfi.service.CurrencyConversionService;
import com.myfi.mailscraping.service.OpenAIService.ExtractedDetailsFromEmail;
import com.myfi.credentials.service.CredentialsService;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GmailService {

	private static final Logger logger = LoggerFactory.getLogger(GmailService.class);
	private static final String APPLICATION_NAME = "MyFi";
	private static final String USER_ID = "me";

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

	@Autowired
	private AccountHistoryService accountHistoryService;

	@Autowired
	private AccountMatchingService accountMatchingService;

	@Autowired
	private CurrencyConversionService currencyConversionService;

	@Autowired
	private SystemStatusService systemStatusService;

	@Autowired
	private CredentialsService credentialsService;

	public List<String> syncAndProcessEmails() {
		return syncAndProcessEmailsNewImplementation();
	}

	/**
	 * New email-based processing implementation.
	 * Processes each email once against all relevant accounts instead of processing per account.
	 */
	public List<String> syncAndProcessEmailsNewImplementation() {
		List<String> allSuccessfullyProcessedMessageIds = new ArrayList<>();

		logger.info("Starting Gmail sync process with new email-based processing approach.");

		List<Account> allAccounts = accountService.getAllAccounts();
		List<Account> supportedAccounts = allAccounts.stream()
				.filter(acc -> Constants.CC_EMAIL_SCRAPING_SUPPORTED_EMAILS_IDS.containsKey(acc.getName())
						|| Constants.BANK_EMAIL_SCRAPING_SUPPORTED_EMAILS_IDS.containsKey(acc.getName()))
				.collect(Collectors.toList());

		if (supportedAccounts == null || supportedAccounts.isEmpty()) {
			logger.info("No supported accounts found to sync emails for.");
			return allSuccessfullyProcessedMessageIds;
		}

		logger.info("Found {} supported accounts for Gmail sync.", supportedAccounts.size());

		// Initialize single operation for email processing
		String operationId = "GMAIL_SYNC_" + System.currentTimeMillis();
		refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId,
				"Email Processing", Optional.empty());

		try {
			// Step 1: Authenticate with Gmail
			Credential credential;
			Gmail service;
			try {
				refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId,
						RefreshJobStatus.LOGIN_STARTED, "Authenticating with Google for email processing");
				credential = googleAuthService.getCredentials();
				service = new Gmail.Builder(httpTransport, jsonFactory, credential)
						.setApplicationName(APPLICATION_NAME)
						.build();
				refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId,
						RefreshJobStatus.LOGIN_SUCCESS, "Google authentication successful");
			} catch (Exception e) {
				logger.error("Authentication failed: {}", e.getMessage(), e);
				refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, operationId,
						"Authentication failed: " + e.getMessage());
				return allSuccessfullyProcessedMessageIds;
			}

			// Step 2: Fetch all relevant emails
			List<Message> allEmails;
			try {
				refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId,
						RefreshJobStatus.PROCESSING_STARTED, "Fetching emails from all supported senders");
				allEmails = fetchAllRelevantEmails(service, supportedAccounts);
				logger.info("Fetched {} emails from all supported senders", allEmails.size());
			} catch (Exception e) {
				logger.error("Failed to fetch emails: {}", e.getMessage(), e);
				refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, operationId,
						"Failed to fetch emails: " + e.getMessage());
				return allSuccessfullyProcessedMessageIds;
			}

			if (allEmails.isEmpty()) {
				logger.info("No new emails found to process");
				refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, operationId,
						"No new emails found to process");
				systemStatusService.updateLastScrapeTime();
				return allSuccessfullyProcessedMessageIds;
			}

			// Step 3: Process each email against all accounts
			int totalEmails = allEmails.size();
			int processedEmails = 0;
			int totalTransactionsCreated = 0;

			refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId,
					RefreshJobStatus.PROCESSING_IN_PROGRESS,
					"Processing " + totalEmails + " emails", 0, Optional.of(totalEmails));

			for (Message emailSummary : allEmails) {
				String messageId = emailSummary.getId();
				logger.info("Processing email {}", messageId);
				processedEmails++;

				try {
					// Check if email was already processed globally
					// if (processedGmailMessagesTrackerService.isEmailProcessed(messageId)) {
					// 	// Check if there are any unprocessed accounts for this email
					// 	Set<String> allAccountNumbers = supportedAccounts.stream()
					// 			.map(Account::getAccountNumber)
					// 			.collect(Collectors.toSet());
					// 	Set<String> unprocessedAccounts = processedGmailMessagesTrackerService
					// 			.getUnprocessedAccountsForEmail(messageId, allAccountNumbers);

					// 	if (unprocessedAccounts.isEmpty()) {
					// 		logger.debug("Email {} already fully processed for all accounts", messageId);
					// 		continue;
					// 	} else {
					// 		logger.info("Email {} partially processed, processing for {} remaining accounts",
					// 				messageId, unprocessedAccounts.size());
					// 	}
					// }

					// Process this email
					int transactionsFromEmail = processEmailForAllSupportedAccounts(service, emailSummary, supportedAccounts, operationId);
					totalTransactionsCreated += transactionsFromEmail;

					if (transactionsFromEmail > 0) {
						allSuccessfullyProcessedMessageIds.add(messageId);
					}

				} catch (Exception e) {
					logger.error("Error processing email {}: {}", messageId, e.getMessage(), e);
					// Continue processing other emails
				}

				// Update progress
				refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId,
						RefreshJobStatus.PROCESSING_IN_PROGRESS,
						"Processed email " + processedEmails + "/" + totalEmails + " (" + totalTransactionsCreated + " transactions created)",
						processedEmails, Optional.of(totalEmails));
			}

			String completionMessage = String.format(
					"Gmail sync completed. Processed %d emails, created %d transactions.",
					totalEmails, totalTransactionsCreated);
			logger.info(completionMessage);
			refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, operationId, completionMessage);
			systemStatusService.updateLastScrapeTime();

		} catch (Exception e) {
			logger.error("Unexpected error during Gmail sync: {}", e.getMessage(), e);
			refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, operationId,
					"Unexpected error: " + e.getMessage());
		}

		return allSuccessfullyProcessedMessageIds;
	}

	/**
	 * Fetches all relevant emails from Gmail using a unified query.
	 * This reduces the number of Gmail API calls compared to the account-based approach.
	 */
	private List<Message> fetchAllRelevantEmails(Gmail service, List<Account> supportedAccounts) throws IOException {
		// Build unified query for all supported email senders
		String unifiedQuery = buildUnifiedGmailQuery(supportedAccounts);
		logger.info("Executing unified Gmail search query: [{}]", unifiedQuery);

		List<Message> allMessages = new ArrayList<>();
		String nextPageToken = null;
		ListMessagesResponse response;

		do {
			response = service.users().messages().list(USER_ID)
					.setQ(unifiedQuery)
					.setPageToken(nextPageToken)
					.execute();
			if (response.getMessages() != null && !response.getMessages().isEmpty()) {
				allMessages.addAll(response.getMessages());
			}
			nextPageToken = response.getNextPageToken();
		} while (nextPageToken != null);

		Collections.reverse(allMessages); // Process oldest first
		return allMessages;
	}

	/**
	 * Builds a unified Gmail query that includes all supported email senders.
	 */
	private String buildUnifiedGmailQuery(List<Account> supportedAccounts) {
		Set<String> allSenderEmails = new HashSet<>();

		// Collect all unique sender emails from all accounts
		for (Account account : supportedAccounts) {
			List<String> senderEmails = Constants.CC_EMAIL_SCRAPING_SUPPORTED_EMAILS_IDS.get(account.getName());
			if (senderEmails != null) {
				allSenderEmails.addAll(senderEmails);
			}

			List<String> bankEmails = Constants.BANK_EMAIL_SCRAPING_SUPPORTED_EMAILS_IDS.get(account.getName());
			if (bankEmails != null) {
				allSenderEmails.addAll(bankEmails);
			}
		}

		StringBuilder queryBuilder = new StringBuilder("from:{");
		queryBuilder.append(String.join(" OR ", allSenderEmails));
		queryBuilder.append("}");

		try {
			final String LOOKBACK_KEY = Constants.FORCE_GMAIL_LOOKBACK_UNTIL_DATE_KEY;
			String lookbackDateStr = credentialsService.getCredential(LOOKBACK_KEY);

			if (lookbackDateStr != null) {
				LocalDateTime lookbackDate = LocalDateTime.parse(lookbackDateStr);
				long epochSeconds = lookbackDate.toEpochSecond(ZoneOffset.ofHoursMinutes(5, 30)) - 1;
				queryBuilder.append(" after:").append(epochSeconds);
				logger.info("Using forced lookback date: {}", lookbackDate);
				credentialsService.deleteCredential(LOOKBACK_KEY);
			} else {
				// Use the default logic if no forced lookback is set
				LocalDateTime now = LocalDateTime.now(ZoneOffset.ofHoursMinutes(5, 30));
				LocalDateTime oneMonthAgo = now.minusMonths(1);

				List<LocalDateTime> lastMessageDates = supportedAccounts.stream()
					.map(account -> processedGmailMessagesTrackerService.findLatestMessageDateTimeForAccount(account.getAccountNumber())
						.orElse(oneMonthAgo))
					.collect(Collectors.toList());

				Optional<LocalDateTime> earliestLastMessageDate = lastMessageDates.stream().min(LocalDateTime::compareTo);

				if (earliestLastMessageDate.isPresent()) {
					long epochSecondsSinceLastEmail = earliestLastMessageDate.get().toEpochSecond(ZoneOffset.UTC) - 1;
					queryBuilder.append(" after:").append(epochSecondsSinceLastEmail);
					logger.info("Using earliest last message epoch: {}", epochSecondsSinceLastEmail);
				} else {
					queryBuilder.append(" after:").append(oneMonthAgo.toEpochSecond(ZoneOffset.ofHoursMinutes(5, 30)));
					logger.info("Using default 1-month lookback period");
				}
			}
		} catch (Exception e) {
			logger.error("Failed to determine lookback date, defaulting to 30 days", e);
			LocalDateTime thirtyDaysAgo = LocalDateTime.now(ZoneOffset.UTC).minusDays(30);
			long epochSeconds = thirtyDaysAgo.toEpochSecond(ZoneOffset.UTC);
			queryBuilder.append(" after:").append(epochSeconds);
		}

		return queryBuilder.toString();
	}

	/**
	 * Processes a single email against all relevant accounts.
	 * This is the core method of the new email-based approach.
	 */
	private int processEmailForAllSupportedAccounts(Gmail service, Message emailSummary, List<Account> supportedAccounts, String operationId) {
		String messageId = emailSummary.getId();
		int transactionsCreated = 0;
		Set<String> processedAccountNumbers = new HashSet<>();

		try {
			// Fetch full email content
			Message fullMessage = service.users().messages().get(USER_ID, messageId).setFormat("full").execute();
			LocalDateTime messageDateTime = null;
			if (fullMessage.getInternalDate() != null) {
				messageDateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(fullMessage.getInternalDate()), ZoneOffset.UTC);
			}

			// Extract clean text from email
			String cleanTextBody = emailParser.extractTextFromMessage(fullMessage);
			if (StringUtils.isBlank(cleanTextBody)) {
				logger.warn("Could not extract clean text body for message ID: {}", messageId);
				return 0;
			}

			cleanTextBody = cleanTextBody.replaceAll("\\s", " ");
			logger.debug("Processing email {} with content length: {}", messageId, cleanTextBody.length());

			// Find all accounts that match this email content
			List<Account> matchingAccounts = accountMatchingService.findMatchingAccounts(cleanTextBody, supportedAccounts);
			Set<String> matchingAccountNumbers = matchingAccounts.stream().map(Account::getAccountNumber).collect(Collectors.toSet());
			
			Set<String> nonMatchingAccountNumbers = supportedAccounts.stream().map(Account::getAccountNumber).collect(Collectors.toSet());
			nonMatchingAccountNumbers.removeAll(matchingAccountNumbers);
			processedGmailMessagesTrackerService.markEmailProcessedForAccounts(messageId, nonMatchingAccountNumbers, messageDateTime, 0);

			if (matchingAccounts.isEmpty()) {
				logger.debug("No matching accounts found for email {}. Non-matching accounts: {}", messageId, nonMatchingAccountNumbers);
				return 0;
			}

			// Filter out accounts that have already processed this email
			
			Set<String> unprocessedAccountNumbers = processedGmailMessagesTrackerService.getUnprocessedAccountsForEmail(messageId, matchingAccountNumbers);

			// If there are no accounts left to process for this email, skip it.
			if (unprocessedAccountNumbers.isEmpty()) {
				logger.debug("All matching accounts have already processed email {}. Skipping.", messageId);
				return 0;
			}

			// If the list of unprocessed accounts is smaller than the list of matching accounts,
			// it means some have been processed. We filter the list to only include the unprocessed ones.
			if (unprocessedAccountNumbers.size() < matchingAccountNumbers.size()) {
				logger.info("Filtering matching accounts for email {}. Before: {}, After: {}", 
					messageId, matchingAccounts.size(), unprocessedAccountNumbers.size());
				matchingAccounts = matchingAccounts.stream()
					.filter(acc -> unprocessedAccountNumbers.contains(acc.getAccountNumber()))
					.collect(Collectors.toList());
			}

			logger.info("Email {} matches {} accounts: {}", messageId, matchingAccounts.size(),
					matchingAccounts.stream().map(Account::getName).collect(Collectors.toList()));

			// Extract transaction details using AI
			Optional<ExtractedDetailsFromEmail> extractedDetails = openAIService.extractDetailsFromEmail(cleanTextBody);
			if (extractedDetails.isEmpty()) {
				logger.warn("Could not extract transaction details from message ID: {}", messageId);
				// Still mark as processed for all matching accounts to avoid reprocessing
				Set<String> accountNumbers = matchingAccounts.stream()
						.map(Account::getAccountNumber)
						.collect(Collectors.toSet());
				processedGmailMessagesTrackerService.markEmailProcessedForAccounts(messageId, accountNumbers, messageDateTime, 0);
				return 0;
			}

			ExtractedDetailsFromEmail details = extractedDetails.get();
			logger.debug("Extracted details from email {}: type={}, successful={}", messageId, details.getEmailType(), details.isTransactionSuccessful());

			// Safeguard 1: Validate Transaction Date
			if (messageDateTime != null) {
				java.time.LocalDate aiDate = details.getTransactionDate();
				java.time.LocalDate emailDate = messageDateTime.toLocalDate();
				long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(aiDate, emailDate);

				if (Math.abs(daysBetween) > 1) {
					logger.warn("AI-extracted date {} is more than 1 day away from email received date {}. Overriding with email date.", aiDate, emailDate);
					details.setTransactionDate(emailDate);
				}
			}


			// Process based on email type
			if (details.getEmailType() == EmailType.TRANSACTION_INFORMATION && details.isTransactionSuccessful()) {
				// Create transactions for matching accounts
				for (Account matchingAccount : matchingAccounts) {
					try {
						Transaction transaction = mapExtractedTransactionDetailsToTransactionForAccount(messageId, details, matchingAccount);
						if (transaction != null) {
							Transaction savedTransaction = transactionService.createTransaction(transaction);
							logger.info("Created transaction {} for email {} and account {}", 
									savedTransaction.getId(), messageId, matchingAccount.getName());
							transactionsCreated++;
						}
						processedAccountNumbers.add(matchingAccount.getAccountNumber());
					} catch (IllegalArgumentException e) {
						logger.warn("Failed to save transaction (duplicate/validation) for message ID {} and account {}: {}", 
								messageId, matchingAccount.getName(), e.getMessage());
						processedAccountNumbers.add(matchingAccount.getAccountNumber());
					} catch (Exception e) {
						logger.error("Error saving transaction for message ID {} and account {}: {}", 
								messageId, matchingAccount.getName(), e.getMessage(), e);
						// Don't add to processed accounts if there was an error
					}
				}
			} else if (details.getEmailType() == EmailType.ACCOUNT_BALANCE_INFORMATION) {
				// Update account balances for matching accounts
				for (Account matchingAccount : matchingAccounts) {
					try {
						// Validate account number if present in extracted details
						String extractedAccountNumber = details.getAccountNumber();
						if (extractedAccountNumber != null && extractedAccountNumber.length() >= 4) {
							String extractedLast4 = extractedAccountNumber.substring(extractedAccountNumber.length() - 4);
							String accountLast4 = matchingAccount.getAccountNumber().substring(matchingAccount.getAccountNumber().length() - 4);
							if (!extractedLast4.equals(accountLast4)) {
								logger.debug("Skipping balance update for account {} - account number mismatch", matchingAccount.getName());
								continue;
							}
						}

						BigDecimal newBalance = BigDecimal.valueOf(details.getAmount());
						accountHistoryService.createAccountHistoryRecord(matchingAccount.getId(), newBalance);
						logger.info("Updated balance for account {} from email {}", matchingAccount.getName(), messageId);
						processedAccountNumbers.add(matchingAccount.getAccountNumber());
					} catch (Exception e) {
						logger.error("Error updating balance for account {} from email {}: {}", 
								matchingAccount.getName(), messageId, e.getMessage(), e);
					}
				}
			} else {
				logger.debug("Email {} is not a successful transaction or balance update: type={}, successful={}", 
						messageId, details.getEmailType(), details.isTransactionSuccessful());
				// Still mark as processed to avoid reprocessing
				processedAccountNumbers = matchingAccounts.stream()
						.map(Account::getAccountNumber)
						.collect(Collectors.toSet());
			}

			// Mark email as processed for all relevant accounts
			if (!processedAccountNumbers.isEmpty()) {
				processedGmailMessagesTrackerService.markEmailProcessedForAccounts(messageId, processedAccountNumbers, messageDateTime, transactionsCreated);
			}
			// Mark the email as processed for all accounts that were not processed
			Set<String> unProcessedMatchingAccountNumbers = new HashSet<>(matchingAccountNumbers);
			unProcessedMatchingAccountNumbers.removeAll(processedAccountNumbers);
			processedGmailMessagesTrackerService.markEmailProcessedForAccounts(messageId, unProcessedMatchingAccountNumbers, messageDateTime, transactionsCreated);

		} catch (IOException e) {
			logger.error("IOException fetching/processing email {}: {}", messageId, e.getMessage(), e);
		} catch (Exception e) {
			logger.error("Unexpected error processing email {}: {}", messageId, e.getMessage(), e);
		}

		return transactionsCreated;
	}

	/**
	 * Maps extracted transaction details to a Transaction entity for a specific account.
	 * This is an enhanced version that works with the email-based processing approach.
	 */
	private Transaction mapExtractedTransactionDetailsToTransactionForAccount(String messageId,
			ExtractedDetailsFromEmail details, Account targetAccount) {
		if (details.getEmailType() != EmailType.TRANSACTION_INFORMATION) {
			logger.debug("Skipping as not a transaction: {}", details);
			return null;
		}
		if (!details.isTransactionSuccessful()) {
			logger.debug("Skipping transaction as it's not successful: {}", details);
			return null;
		}

		// Enhanced validation using account matching
		if (!accountMatchingService.validateAccountMatch(targetAccount, details.getAccountNumber())) {
			logger.debug("Account {} does not match extracted account number {}. Checking for fallback.",
					targetAccount.getName(), details.getAccountNumber());

			// Fallback for HDFC Pixel card which may not have account number in all emails.
			// This is a specific exception to prevent creating transactions for wrong accounts.
			boolean isHdfcPixelCard = Constants.HDFC_PIXEL.equalsIgnoreCase(targetAccount.getName());

			if (!isHdfcPixelCard) {
				logger.warn("Account number mismatch. Skipping transaction for account {}.", targetAccount.getName());
				return null;
			}

			// Additionally, ensure the AI also identified it as a Pixel card transaction for extra safety.
			if (!details.isPixelCardTransaction()) {
				logger.warn(
						"Account is HDFC Pixel, but AI did not identify this as a Pixel card transaction. Skipping for safety.");
				return null;
			}

			logger.info("Proceeding with transaction for HDFC Pixel card based on fallback logic for account {}.",
					targetAccount.getName());
		}

		// Handle currency conversion
		BigDecimal originalAmount = BigDecimal.valueOf(details.getAmount());
		BigDecimal convertedAmount = originalAmount;
		String currencyCode = details.getCurrencyCode();
		
		// Validate currency code
		if (!currencyConversionService.isValidCurrencyCode(currencyCode)) {
			logger.warn("Invalid currency code '{}' for transaction, defaulting to INR", currencyCode);
			currencyCode = "INR";
		}
		
		// Convert to INR if not already in INR
		if (!"INR".equalsIgnoreCase(currencyCode)) {
			convertedAmount = currencyConversionService.convertToINR(
				originalAmount, 
				currencyCode, 
				details.getTransactionDate()
			);
			logger.info("Converted {} {} to {} INR for transaction on {}", 
				originalAmount, currencyCode, convertedAmount, details.getTransactionDate());
		}

		return Transaction.builder()
				.amount(convertedAmount)
				.originalAmount(originalAmount)
				.currencyCode(currencyCode)
				.description("Email Message ID: " + messageId)
				.counterParty(details.getDescription())
				.type(Transaction.TransactionType.valueOf(details.getTransactionType()))
				.transactionDate(details.getTransactionDate().atStartOfDay())
				.createdAt(LocalDateTime.now())
				.account(targetAccount)
				.emailMessageId(messageId)
				.build();
	}

}