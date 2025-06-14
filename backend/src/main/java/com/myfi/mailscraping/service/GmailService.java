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
import com.myfi.service.TransactionService;
import com.myfi.mailscraping.service.OpenAIService.ExtractedDetailsFromEmail;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

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

	public List<String> syncAndProcessEmails() {
		List<String> allSuccessfullyProcessedMessageIds = new ArrayList<>();

		logger.info("Starting Gmail sync process for all configured accounts.");

		List<Account> allAccounts = accountService.getAllAccounts();
		List<Account> supportedAccounts = allAccounts.stream()
				.filter(acc -> Constants.CC_EMAIL_SCRAPING_SUPPORTED_EMAILS_IDS.containsKey(acc.getName())
						|| Constants.BANK_EMAIL_SCRAPING_SUPPORTED_EMAILS_IDS.containsKey(acc.getName()))
				.collect(java.util.stream.Collectors.toList());

		if (supportedAccounts == null || supportedAccounts.isEmpty()) {
			logger.info("No supported accounts found to sync emails for.");
			return allSuccessfullyProcessedMessageIds;
		}

		logger.info("Found {} supported accounts to process for Gmail sync.", supportedAccounts.size());
		int totalAccounts = supportedAccounts.size();
		int accountsProcessedCount = 0;

		for (Account account : supportedAccounts) {
			String accountNumber = account.getAccountNumber();
			String accountOperationId = String.valueOf(accountNumber);
			refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, accountOperationId,
					account.getName(), Optional.empty());
		}

		for (Account account : supportedAccounts) {
			accountsProcessedCount++;
			String accountName = account.getName();
			Long accountId = account.getId();
			String accountNumber = account.getAccountNumber();
			String accountOperationId = String.valueOf(accountNumber);

			logger.info("Preparing to sync account: {} (ID: {}, AccountNumber: {}) - {}/{} of total accounts.",
					accountName,
					accountOperationId, accountNumber, accountsProcessedCount, totalAccounts);

			Credential credential;
			Gmail service;

			try {
				refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, accountOperationId,
						RefreshJobStatus.LOGIN_STARTED, "Authenticating with Google for account " + accountName);
				credential = googleAuthService.getCredentials();
				service = new Gmail.Builder(httpTransport, jsonFactory, credential)
						.setApplicationName(APPLICATION_NAME)
						.build();
				refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, accountOperationId,
						RefreshJobStatus.LOGIN_SUCCESS, "Google authentication successful for account " + accountName);
			} catch (IllegalStateException e) {
				logger.error("Authentication failed for account '{}' (OpID: {}). Error: {}", accountName,
						accountOperationId, e.getMessage(), e);
				refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, accountOperationId,
						"Authentication failed for account " + accountName + ": " + e.getMessage());
				continue; // Move to the next account
			} catch (Exception e) {
				logger.error("Failed to initialize Gmail service for account '{}' (OpID: {}). Error: {}", accountName,
						accountOperationId, e.getMessage(), e);
				refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, accountOperationId,
						"Gmail service initialization failed for account " + accountName + ": " + e.getMessage());
				continue; // Move to the next account
			}

			if (!Constants.CC_EMAIL_SCRAPING_SUPPORTED_EMAILS_IDS.containsKey(accountName)) {
				logger.warn(
						"Account '{}' (ID: {}) is not configured in Constants.CC_SUPPORTED_BANK_EMAILS. Skipping sync for this account.",
						accountName, accountOperationId);
				refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, accountOperationId,
						"Account not configured for email sync (missing in CC_SUPPORTED_BANK_EMAILS).");
				continue;
			}

			List<String> senderEmails = Constants.CC_EMAIL_SCRAPING_SUPPORTED_EMAILS_IDS.get(accountName);
			if (senderEmails == null || senderEmails.isEmpty()) {
				logger.warn("No sender emails configured for account '{}' (ID: {}). Skipping sync for this account.",
						accountName, accountOperationId);
				refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, accountOperationId,
						"No sender emails configured for account " + accountName + ".");
				continue;
			}

			List<String> successfullyProcessedMessageIdsForAccount = new ArrayList<>();
			int processedMessagesInAccountRun = 0;

			try {
				refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, accountOperationId,
						RefreshJobStatus.PROCESSING_STARTED,
						"Fetching and processing emails for account: " + accountName);

				StringBuilder queryBuilder = new StringBuilder("from:{");
				boolean firstEmail = true;
				for (String email : senderEmails) {
					if (!firstEmail)
						queryBuilder.append(" ");
					queryBuilder.append(email.trim());
					firstEmail = false;
				}
				queryBuilder.append("}");

				Optional<LocalDateTime> latestDateTimeOpt = processedGmailMessagesTrackerService
						.findLatestMessageDateTime(accountNumber);
				if (latestDateTimeOpt.isPresent()) {
					long epochSecondsSinceLastEmail = latestDateTimeOpt.get().toEpochSecond(ZoneOffset.UTC) - 1;
					queryBuilder.append(" after:").append(epochSecondsSinceLastEmail);
					logger.info("Latest message epoch: {}", epochSecondsSinceLastEmail);
				} else {
					LocalDateTime now = LocalDateTime.now(ZoneOffset.ofHoursMinutes(5, 30));
					LocalDateTime threeMonthsAgo = now.minusMonths(2);

					// Calculate the statement generation date ~3 months ago
					Integer statementGenerationDay = account.getCcStatementGenerationDay();
					statementGenerationDay = statementGenerationDay == null ? 28 : statementGenerationDay;
					LocalDateTime statementDate = threeMonthsAgo.withDayOfMonth(statementGenerationDay)
							.withHour(0)
							.withMinute(0)
							.withSecond(0)
							.withNano(0);

					LocalDateTime oneDayAfterStatementDate = statementDate.plusDays(1);

					queryBuilder.append(" after:")
							.append(oneDayAfterStatementDate.toEpochSecond(ZoneOffset.ofHoursMinutes(5, 30)));
					logger.info("3 months ago epoch: {}",
							oneDayAfterStatementDate.toEpochSecond(ZoneOffset.ofHoursMinutes(5, 30)));
				}
				String finalQuery = queryBuilder.toString();
				logger.info("Executing Gmail search query for account '{}' (OpID: {}): [{}]", accountName,
						accountOperationId, finalQuery);

				List<Message> allMessages = new ArrayList<>();
				String nextPageToken = null;
				ListMessagesResponse response;

				do {
					response = service.users().messages().list(USER_ID)
							.setQ(finalQuery)
							.setPageToken(nextPageToken)
							.execute();
					if (response.getMessages() != null && !response.getMessages().isEmpty()) {
						allMessages.addAll(response.getMessages());
					}
					nextPageToken = response.getNextPageToken();
				} while (nextPageToken != null);

				List<Message> messages = allMessages; // Use the aggregated list
				Collections.reverse(messages);

				if (messages == null || messages.isEmpty()) {
					logger.info("No new emails found for account '{}' (OpID: {}) matching the query.", accountName,
							accountOperationId);
					// This is a successful completion of the operation for this account, albeit
					// with no new emails.
					refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, accountOperationId,
							"No new emails found for " + accountName + ".");
					continue;
				}

				logger.info("Found {} emails for account '{}' (OpID: {}) matching the query.", messages.size(),
						accountName, accountOperationId);
				refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, accountOperationId,
						RefreshJobStatus.PROCESSING_IN_PROGRESS,
						"Processing " + messages.size() + " emails for " + accountName + ".", 0,
						Optional.of(messages.size()));

				int totalMessagesToProcessForAccount = messages.size();

				for (Message messageSummary : messages) {
					String messageId = messageSummary.getId();
					boolean savedSuccessfullyCurrentMessage = false;
					LocalDateTime messageDateTime = null;

					if (processedGmailMessagesTrackerService.isMessageProcessed(messageId, accountNumber)) {
						logger.info(
								"Skipping already processed message ID: {} for account '{}' (OpID: {}, AccountNumber: {})",
								messageId,
								accountName, accountOperationId, accountNumber);
					} else {
						logger.info("Processing message ID: {} for account '{}' (OpID: {}, AccountNumber: {})",
								messageId, accountName,
								accountOperationId, accountNumber);
						try {
							Message fullMessage = service.users().messages().get(USER_ID, messageId).setFormat("full")
									.execute();
							if (fullMessage.getInternalDate() != null) {
								messageDateTime = LocalDateTime
										.ofInstant(Instant.ofEpochMilli(fullMessage.getInternalDate()), ZoneOffset.UTC);
							}

							String cleanTextBody = emailParser.extractTextFromMessage(fullMessage);
							cleanTextBody = cleanTextBody.replaceAll("\\s", " ");
							if (Constants.EMAIL_SCRAPING_ACCOUNTS_WITHOUT_ACC_NUMBER_IN_MAIL
									.contains(account.getName())) {
								if (account.getName().equals(Constants.HDFC_PIXEL)
										&& !cleanTextBody.toLowerCase().contains("pixel")) {
									logger.info(
											"Skipping message ID: {} for account '{}' (OpID: {}, AccountNumber: {}) as it does not contain the keyword 'pixel'.",
											messageId, accountName, accountOperationId, accountNumber);
									continue;
								}
							} else if (!cleanTextBody.contains(accountNumber.substring(accountNumber.length() - 4))) {
								logger.info(
										"Skipping message ID: {} for account '{}' (OpID: {}, AccountNumber: {}) as it does not contain the account number.",
										messageId, accountName, accountOperationId, accountNumber);
								continue;
							}
							if (StringUtils.isNotBlank(cleanTextBody)) {
								Optional<ExtractedDetailsFromEmail> extractedDetails = openAIService
										.extractDetailsFromEmail(cleanTextBody);
								if (extractedDetails.isPresent()) {
									if (extractedDetails.get().getEmailType() == EmailType.TRANSACTION_INFORMATION) {
										Transaction transaction = mapExtractedTransactionDetailsToTransaction(messageId,
												extractedDetails.get());
										if (transaction != null) {
											if (transaction.getAccount() != null
													&& accountId.equals(transaction.getAccount().getId())) {
												try {
													Transaction savedTransaction = transactionService
															.createTransaction(transaction);
													logger.info(
															"Saved transaction with ID: {} for message ID: {} (Account: {}, OpID: {}, AccountNumber: {})",
															savedTransaction.getId(), messageId, accountName,
															accountOperationId, accountNumber);
													savedSuccessfullyCurrentMessage = true;
												} catch (IllegalArgumentException e) {
													logger.warn(
															"Failed to save transaction (duplicate/validation) for message ID {} (Account: {}, OpID: {}, AccountNumber: {}): {}",
															messageId, accountName, accountOperationId, accountNumber,
															e.getMessage());
												} catch (Exception e) {
													logger.error(
															"Error saving transaction for message ID {} (Account: {}, OpID: {}, AccountNumber: {}): {}",
															messageId, accountName, accountOperationId, accountNumber,
															e.getMessage(), e);
												}
											} else {
												logger.warn(
														"Skipping transaction for message ID {} as its derived account (ID: {}) does not match current processing account '{}' (ID: {}) and AccountNumber: {}. Details: {}",
														messageId,
														(transaction.getAccount() != null
																? transaction.getAccount().getId()
																: "null"),
														accountName, accountId, accountNumber, extractedDetails.get());
											}
										}
									} else if (extractedDetails.get().getEmailType() == EmailType.ACCOUNT_BALANCE_INFORMATION) {
										// update account balance
										String extractedAccountNumber = extractedDetails.get().getAccountNumber();
										if (extractedAccountNumber == null || !extractedAccountNumber.substring(extractedAccountNumber.length() - 4).equals(accountNumber.substring(accountNumber.length() - 4))) {
											logger.warn("Not updating account blance as invalid account number: {}", extractedAccountNumber);
											continue;
										}
										BigDecimal newBalance = BigDecimal.valueOf(extractedDetails.get().getAmount());
										accountHistoryService.createAccountHistoryRecord(account.getId(), newBalance);
									}
								} else {
									logger.warn(
											"Could not extract transaction details from message ID: {} (Account: {}, OpID: {}, AccountNumber: {})",
											messageId, accountName, accountOperationId, accountNumber);
								}
							} else {
								logger.warn(
										"Could not extract clean text body for message ID: {} (Account: {}, OpID: {}, AccountNumber: {})",
										messageId, accountName, accountOperationId, accountNumber);
							}
						} catch (IOException e) {
							logger.error(
									"IOException fetching/processing full message ID {} (Account: {}, OpID: {}, AccountNumber: {}): {}",
									messageId, accountName, accountOperationId, accountNumber, e.getMessage(), e);
							// This error is for a single message, not the whole account operation, so we
							// don't fail the operation here.
						} catch (Exception e) {
							logger.error(
									"Unexpected error processing message ID {} (Account: {}, OpID: {}, AccountNumber: {}): {}",
									messageId, accountName, accountOperationId, accountNumber, e.getMessage(), e);
						} finally {
							processedGmailMessagesTrackerService.saveProcessedMessage(messageId, accountNumber,
									messageDateTime);
							if (savedSuccessfullyCurrentMessage) {
								successfullyProcessedMessageIdsForAccount.add(messageId);
							}
						}
					}
					processedMessagesInAccountRun++;
					refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, accountOperationId,
							RefreshJobStatus.PROCESSING_IN_PROGRESS,
							"Processed email " + processedMessagesInAccountRun + "/" + totalMessagesToProcessForAccount
									+ " for " + accountName,
							processedMessagesInAccountRun, Optional.of(totalMessagesToProcessForAccount));
				}

				String completionMessageAccount = String.format(
						"Gmail sync for %s (OpID: %s) completed. Processed %d potential messages, found %d new transactions.",
						accountName, accountOperationId, totalMessagesToProcessForAccount,
						successfullyProcessedMessageIdsForAccount.size());
				logger.info(completionMessageAccount);
				refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, accountOperationId,
						completionMessageAccount);
				allSuccessfullyProcessedMessageIds.addAll(successfullyProcessedMessageIdsForAccount);

			} catch (IOException e) {
				logger.error(
						"Gmail sync for account '{}' (OpID: {}) failed due to API error during email fetching/processing.",
						accountName, accountOperationId, e);
				refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, accountOperationId,
						"Gmail API communication error for " + accountName + ": " + e.getMessage());
			} catch (Exception e) {
				logger.error("An unexpected error occurred during Gmail sync for account '{}' (OpID: {}).", accountName,
						accountOperationId, e);
				refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, accountOperationId,
						"Unexpected error during sync for " + accountName + ": " + e.getMessage());
			} finally {
				logger.info("Finished processing account {} (OpID: {}). {}/{} accounts processed so far.", accountName,
						accountOperationId, accountsProcessedCount, totalAccounts);
			}
		}

		String overallCompletionMessage = String.format(
				"Overall Gmail sync process finished. Attempted to process %d accounts. Total new transactions from emails: %d.",
				totalAccounts, allSuccessfullyProcessedMessageIds.size());
		logger.info(overallCompletionMessage);
		return allSuccessfullyProcessedMessageIds;
	}

	private Transaction mapExtractedTransactionDetailsToTransaction(String messageId,
			ExtractedDetailsFromEmail details) {
		if (details.getEmailType() != EmailType.TRANSACTION_INFORMATION) {
			logger.info("Skipping as not a transaction: {}", details);
			return null;
		}
		if (!details.isTransactionSuccessful()) {
			logger.info("Skipping transaction as it's not successful: {}", details);
			return null;
		}
		if (!details.isPixelCardTransaction()
				&& (StringUtils.isBlank(details.getAccountNumber()) || details.getAccountNumber().length() < 4)) {
			logger.warn("Account number blank or too short: {}", details);
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
			account = accountService.getAccountByCardLast4DigitsNumber(
					details.getAccountNumber().substring(details.getAccountNumber().length() - 4));
			if (account == null) {
				logger.warn("Account for account number not found: {}, transaction: {}", details.getAccountNumber(),
						details);
				return null;
			}
		}
		boolean isScrapingSupportedAccount = false;
		if (account.getType() == Account.AccountType.CREDIT_CARD
				&& Constants.CC_EMAIL_SCRAPING_SUPPORTED_EMAILS_IDS.keySet().contains(account.getName())) {
			isScrapingSupportedAccount = true;
		} else if (account.getType() == Account.AccountType.SAVINGS
				&& Constants.BANK_EMAIL_SCRAPING_SUPPORTED_EMAILS_IDS.keySet().contains(account.getName())) {
			isScrapingSupportedAccount = true;
		}
		if (!isScrapingSupportedAccount) {
			logger.info("Account not supported by email scraper: {}", details);
			return null;
		}
		return Transaction.builder()
				.amount(BigDecimal.valueOf(details.getAmount()))
				.description("Email Message ID: " + messageId)
				.counterParty(details.getDescription())
				.type(Transaction.TransactionType.valueOf(details.getTransactionType()))
				.transactionDate(details.getTransactionDate().atStartOfDay())
				.createdAt(LocalDateTime.now())
				.account(account)
				.build();
	}
}