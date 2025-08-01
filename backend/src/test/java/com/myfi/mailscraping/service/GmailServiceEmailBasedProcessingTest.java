package com.myfi.mailscraping.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.myfi.mailscraping.enums.EmailType;
import com.myfi.mailscraping.service.OpenAIService.ExtractedDetailsFromEmail;
import com.myfi.model.Account;
import com.myfi.model.Transaction;
import com.myfi.refresh.service.RefreshTrackingService;
import com.myfi.service.AccountHistoryService;
import com.myfi.service.AccountService;
import com.myfi.service.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GmailServiceEmailBasedProcessingTest {

    @Mock
    private GoogleAuthService googleAuthService;
    @Mock
    private HttpTransport httpTransport;
    @Mock
    private JsonFactory jsonFactory;
    @Mock
    private OpenAIService openAIService;
    @Mock
    private EmailParser emailParser;
    @Mock
    private TransactionService transactionService;
    @Mock
    private AccountService accountService;
    @Mock
    private ProcessedGmailMessagesTrackerService processedGmailMessagesTrackerService;
    @Mock
    private RefreshTrackingService refreshTrackingService;
    @Mock
    private AccountHistoryService accountHistoryService;
    @Mock
    private AccountMatchingService accountMatchingService;

    @Mock
    private Gmail gmailService;
    @Mock
    private Gmail.Users gmailUsers;
    @Mock
    private Gmail.Users.Messages gmailMessages;
    @Mock
    private Gmail.Users.Messages.List gmailMessagesList;
    @Mock
    private Gmail.Users.Messages.Get gmailMessagesGet;
    @Mock
    private Credential credential;

    @InjectMocks
    private GmailService service;

    private List<Account> testAccounts;
    private Account hdfcAccount;
    private Account iciciAccount;
    private Message testEmailSummary;
    private Message testFullMessage;
    private ExtractedDetailsFromEmail testExtractedDetails;

    @BeforeEach
    void setUp() throws Exception {
        // Setup test accounts
        hdfcAccount = new Account();
        hdfcAccount.setId(1L);
        hdfcAccount.setName("HDFC");
        hdfcAccount.setType(Account.AccountType.CREDIT_CARD);
        hdfcAccount.setAccountNumber("1234567890123456");
        hdfcAccount.setBalance(BigDecimal.valueOf(5000));
        hdfcAccount.setCurrency("INR");
        hdfcAccount.setActive(true);
        hdfcAccount.setCreatedAt(LocalDateTime.now());

        iciciAccount = new Account();
        iciciAccount.setId(2L);
        iciciAccount.setName("ICICI");
        iciciAccount.setType(Account.AccountType.CREDIT_CARD);
        iciciAccount.setAccountNumber("9876543210987654");
        iciciAccount.setBalance(BigDecimal.valueOf(3000));
        iciciAccount.setCurrency("INR");
        iciciAccount.setActive(true);
        iciciAccount.setCreatedAt(LocalDateTime.now());

        testAccounts = Arrays.asList(hdfcAccount, iciciAccount);

        // Setup test email messages
        testEmailSummary = new Message();
        testEmailSummary.setId("test-message-123");

        testFullMessage = new Message();
        testFullMessage.setId("test-message-123");
        testFullMessage.setInternalDate(System.currentTimeMillis());

        // Setup extracted transaction details
        testExtractedDetails = ExtractedDetailsFromEmail.builder()
                .emailType(EmailType.TRANSACTION_INFORMATION)
                .isTransactionSuccessful(true)
                .amount(1500.0)
                .description("Amazon Purchase")
                .transactionType("DEBIT")
                .transactionDate(LocalDate.now())
                .accountNumber("1234567890123456")
                .isPixelCardTransaction(false)
                .build();

        // Setup Gmail API mocks
        when(googleAuthService.getCredentials()).thenReturn(credential);
        when(gmailService.users()).thenReturn(gmailUsers);
        when(gmailUsers.messages()).thenReturn(gmailMessages);
        when(gmailMessages.list("me")).thenReturn(gmailMessagesList);
        when(gmailMessages.get("me", "test-message-123")).thenReturn(gmailMessagesGet);
        when(gmailMessagesGet.setFormat("full")).thenReturn(gmailMessagesGet);
        when(gmailMessagesGet.execute()).thenReturn(testFullMessage);
    }

    @Test
    void syncAndProcessEmailsNewImplementation_shouldProcessEmailsSuccessfully() throws Exception {
        // Setup
        setupMocksForSuccessfulProcessing();

        // Execute
        List<String> result = service.syncAndProcessEmailsNewImplementation();

        // Verify
        assertEquals(1, result.size());
        assertEquals("test-message-123", result.get(0));

        // Verify Gmail authentication occurred
        verify(googleAuthService).getCredentials();

        // Verify email fetching occurred
        verify(gmailMessagesList).setQ(contains("from:"));
        verify(gmailMessagesList).execute();

        // Verify email processing occurred
        verify(emailParser).extractTextFromMessage(testFullMessage);
        verify(accountMatchingService).findMatchingAccounts(anyString(), eq(testAccounts));
        verify(openAIService).extractDetailsFromEmail(anyString());
        verify(transactionService).createTransaction(any(Transaction.class));

        // Verify tracking occurred
        verify(processedGmailMessagesTrackerService).markEmailProcessedForAccounts(
                eq("test-message-123"), anySet(), any(LocalDateTime.class), eq(1));
    }

    @Test
    void syncAndProcessEmailsNewImplementation_shouldSkipAlreadyProcessedEmails() throws Exception {
        // Setup
        setupMocksForSuccessfulProcessing();
        when(processedGmailMessagesTrackerService.isEmailProcessed("test-message-123")).thenReturn(true);
        when(processedGmailMessagesTrackerService.getUnprocessedAccountsForEmail(
                eq("test-message-123"), anySet())).thenReturn(Collections.emptySet());

        // Execute
        List<String> result = service.syncAndProcessEmailsNewImplementation();

        // Verify
        assertTrue(result.isEmpty());
        verify(emailParser, never()).extractTextFromMessage(any());
        verify(transactionService, never()).createTransaction(any());
    }

    @Test
    void syncAndProcessEmailsNewImplementation_shouldProcessPartiallyProcessedEmails() throws Exception {
        // Setup
        setupMocksForSuccessfulProcessing();
        when(processedGmailMessagesTrackerService.isEmailProcessed("test-message-123")).thenReturn(true);
        when(processedGmailMessagesTrackerService.getUnprocessedAccountsForEmail(
                eq("test-message-123"), anySet())).thenReturn(Set.of("9876543210987654"));

        // Execute
        List<String> result = service.syncAndProcessEmailsNewImplementation();

        // Verify
        assertEquals(1, result.size());
        verify(emailParser).extractTextFromMessage(testFullMessage);
        verify(transactionService).createTransaction(any(Transaction.class));
    }

    @Test
    void syncAndProcessEmailsNewImplementation_shouldHandleNoMatchingAccounts() throws Exception {
        // Setup
        setupMocksForNoMatchingAccounts();

        // Execute
        List<String> result = service.syncAndProcessEmailsNewImplementation();

        // Verify
        assertTrue(result.isEmpty());
        verify(transactionService, never()).createTransaction(any());
        verify(processedGmailMessagesTrackerService, never()).markEmailProcessedForAccounts(
                anyString(), anySet(), any(LocalDateTime.class), anyInt());
    }

    @Test
    void syncAndProcessEmailsNewImplementation_shouldHandleFailedTransactionExtraction() throws Exception {
        // Setup
        setupMocksForFailedExtraction();

        // Execute
        List<String> result = service.syncAndProcessEmailsNewImplementation();

        // Verify
        assertTrue(result.isEmpty());
        verify(transactionService, never()).createTransaction(any());
        verify(processedGmailMessagesTrackerService).markEmailProcessedForAccounts(
                eq("test-message-123"), anySet(), any(LocalDateTime.class), eq(0));
    }

    @Test
    void syncAndProcessEmailsNewImplementation_shouldHandleAccountBalanceUpdates() throws Exception {
        // Setup
        setupMocksForBalanceUpdate();

        // Execute
        List<String> result = service.syncAndProcessEmailsNewImplementation();

        // Verify
        assertTrue(result.isEmpty()); // No transactions created for balance updates
        verify(accountHistoryService).createAccountHistoryRecord(eq(1L), any(BigDecimal.class));
        verify(processedGmailMessagesTrackerService).markEmailProcessedForAccounts(
                eq("test-message-123"), anySet(), any(LocalDateTime.class), eq(0));
    }

    @Test
    void syncAndProcessEmailsNewImplementation_shouldHandleMultipleMatchingAccounts() throws Exception {
        // Setup
        setupMocksForMultipleAccountMatching();

        // Execute
        List<String> result = service.syncAndProcessEmailsNewImplementation();

        // Verify
        assertEquals(1, result.size());
        verify(transactionService, times(2)).createTransaction(any(Transaction.class)); // One for each account
        verify(processedGmailMessagesTrackerService).markEmailProcessedForAccounts(
                eq("test-message-123"), eq(Set.of("1234567890123456", "9876543210987654")), 
                any(LocalDateTime.class), eq(2));
    }

    @Test
    void syncAndProcessEmailsNewImplementation_shouldHandleTransactionCreationErrors() throws Exception {
        // Setup
        setupMocksForSuccessfulProcessing();
        when(transactionService.createTransaction(any(Transaction.class)))
                .thenThrow(new IllegalArgumentException("Duplicate transaction"));

        // Execute
        List<String> result = service.syncAndProcessEmailsNewImplementation();

        // Verify
        assertTrue(result.isEmpty()); // No successful transactions
        verify(processedGmailMessagesTrackerService).markEmailProcessedForAccounts(
                eq("test-message-123"), anySet(), any(LocalDateTime.class), eq(0));
    }

    @Test
    void syncAndProcessEmailsNewImplementation_shouldHandleGmailAuthenticationFailure() throws Exception {
        // Setup
        when(accountService.getAllAccounts()).thenReturn(testAccounts);
        when(googleAuthService.getCredentials()).thenThrow(new IllegalStateException("Auth failed"));

        // Execute
        List<String> result = service.syncAndProcessEmailsNewImplementation();

        // Verify
        assertTrue(result.isEmpty());
        verify(refreshTrackingService).failOperation(any(), anyString(), contains("Authentication failed"));
    }

    @Test
    void syncAndProcessEmailsNewImplementation_shouldHandleNoEmailsFound() throws Exception {
        // Setup
        when(accountService.getAllAccounts()).thenReturn(testAccounts);
        when(googleAuthService.getCredentials()).thenReturn(credential);
        setupGmailServiceMock();
        
        ListMessagesResponse emptyResponse = new ListMessagesResponse();
        emptyResponse.setMessages(Collections.emptyList());
        when(gmailMessagesList.execute()).thenReturn(emptyResponse);

        // Execute
        List<String> result = service.syncAndProcessEmailsNewImplementation();

        // Verify
        assertTrue(result.isEmpty());
        verify(refreshTrackingService).completeOperationSuccessfully(any(), anyString(), 
                contains("No new emails found"));
    }

    // Helper methods for setting up mocks
    private void setupMocksForSuccessfulProcessing() throws Exception {
        when(accountService.getAllAccounts()).thenReturn(testAccounts);
        setupGmailServiceMock();
        setupEmailProcessingMocks();
        when(accountMatchingService.findMatchingAccounts(anyString(), eq(testAccounts)))
                .thenReturn(List.of(hdfcAccount));
        when(openAIService.extractDetailsFromEmail(anyString()))
                .thenReturn(Optional.of(testExtractedDetails));
        
        Transaction savedTransaction = Transaction.builder()
                .id(1L)
                .account(hdfcAccount)
                .amount(BigDecimal.valueOf(1500))
                .build();
        when(transactionService.createTransaction(any(Transaction.class))).thenReturn(savedTransaction);
    }

    private void setupMocksForNoMatchingAccounts() throws Exception {
        when(accountService.getAllAccounts()).thenReturn(testAccounts);
        setupGmailServiceMock();
        setupEmailProcessingMocks();
        when(accountMatchingService.findMatchingAccounts(anyString(), eq(testAccounts)))
                .thenReturn(Collections.emptyList());
    }

    private void setupMocksForFailedExtraction() throws Exception {
        when(accountService.getAllAccounts()).thenReturn(testAccounts);
        setupGmailServiceMock();
        setupEmailProcessingMocks();
        when(accountMatchingService.findMatchingAccounts(anyString(), eq(testAccounts)))
                .thenReturn(List.of(hdfcAccount));
        when(openAIService.extractDetailsFromEmail(anyString())).thenReturn(Optional.empty());
    }

    private void setupMocksForBalanceUpdate() throws Exception {
        when(accountService.getAllAccounts()).thenReturn(testAccounts);
        setupGmailServiceMock();
        setupEmailProcessingMocks();
        when(accountMatchingService.findMatchingAccounts(anyString(), eq(testAccounts)))
                .thenReturn(List.of(hdfcAccount));
        
        ExtractedDetailsFromEmail balanceDetails = ExtractedDetailsFromEmail.builder()
                .emailType(EmailType.ACCOUNT_BALANCE_INFORMATION)
                .amount(5000.0)
                .accountNumber("1234567890123456")
                .transactionDate(LocalDate.now())
                .transactionType("CREDIT")
                .description("Balance Update")
                .isTransactionSuccessful(false)
                .isPixelCardTransaction(false)
                .build();
        
        when(openAIService.extractDetailsFromEmail(anyString())).thenReturn(Optional.of(balanceDetails));
    }

    private void setupMocksForMultipleAccountMatching() throws Exception {
        when(accountService.getAllAccounts()).thenReturn(testAccounts);
        setupGmailServiceMock();
        setupEmailProcessingMocks();
        when(accountMatchingService.findMatchingAccounts(anyString(), eq(testAccounts)))
                .thenReturn(testAccounts); // Both accounts match
        when(openAIService.extractDetailsFromEmail(anyString()))
                .thenReturn(Optional.of(testExtractedDetails));
        
        Transaction savedTransaction1 = Transaction.builder().id(1L).account(hdfcAccount).build();
        Transaction savedTransaction2 = Transaction.builder().id(2L).account(iciciAccount).build();
        when(transactionService.createTransaction(any(Transaction.class)))
                .thenReturn(savedTransaction1, savedTransaction2);
    }

    private void setupGmailServiceMock() throws Exception {
        // Use reflection to set the gmail service mock or create a proper builder mock
        ListMessagesResponse response = new ListMessagesResponse();
        response.setMessages(List.of(testEmailSummary));
        
        when(gmailMessagesList.setQ(anyString())).thenReturn(gmailMessagesList);
        when(gmailMessagesList.setPageToken(any())).thenReturn(gmailMessagesList);
        when(gmailMessagesList.execute()).thenReturn(response);
    }

    private void setupEmailProcessingMocks() throws Exception {
        when(emailParser.extractTextFromMessage(testFullMessage))
                .thenReturn("HDFC Bank transaction alert for card ending 3456. Amount: Rs. 1500");
        when(processedGmailMessagesTrackerService.isEmailProcessed("test-message-123")).thenReturn(false);
        when(processedGmailMessagesTrackerService.findLatestMessageDateTime())
                .thenReturn(Optional.empty());
    }
}