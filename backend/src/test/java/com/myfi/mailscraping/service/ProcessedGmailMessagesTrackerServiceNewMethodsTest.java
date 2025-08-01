package com.myfi.mailscraping.service;

import com.myfi.mailscraping.model.ProcessedGmailMessage;
import com.myfi.mailscraping.repository.ProcessedGmailMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProcessedGmailMessagesTrackerServiceNewMethodsTest {

    @Mock
    private ProcessedGmailMessageRepository repository;

    @InjectMocks
    private ProcessedGmailMessagesTrackerService service;

    private ProcessedGmailMessage testMessage;
    private LocalDateTime testDateTime;
    private Set<String> testAccountNumbers;

    @BeforeEach
    void setUp() {
        testDateTime = LocalDateTime.now();
        testAccountNumbers = Set.of("1234", "5678", "9999");
        
        testMessage = ProcessedGmailMessage.builder()
                .id(1L)
                .messageId("test-message-123")
                .processedAccountNumbers(new HashSet<>(Set.of("1234", "5678")))
                .messageDateTime(testDateTime)
                .firstProcessedAt(testDateTime)
                .lastProcessedAt(testDateTime)
                .transactionCount(2)
                .build();
    }

    // Tests for isEmailProcessed()
    @Test
    void isEmailProcessed_shouldReturnTrueWhenEmailExists() {
        when(repository.existsByMessageId("test-message-123")).thenReturn(true);

        boolean result = service.isEmailProcessed("test-message-123");

        assertTrue(result);
        verify(repository).existsByMessageId("test-message-123");
    }

    @Test
    void isEmailProcessed_shouldReturnFalseWhenEmailDoesNotExist() {
        when(repository.existsByMessageId("test-message-123")).thenReturn(false);

        boolean result = service.isEmailProcessed("test-message-123");

        assertFalse(result);
        verify(repository).existsByMessageId("test-message-123");
    }

    // Tests for isMessageProcessedForAccount()
    @Test
    void isMessageProcessedForAccount_shouldReturnTrueWhenProcessedForAccount() {
        when(repository.isMessageProcessedForAccount("test-message-123", "1234")).thenReturn(true);

        boolean result = service.isMessageProcessedForAccount("test-message-123", "1234");

        assertTrue(result);
        verify(repository).isMessageProcessedForAccount("test-message-123", "1234");
    }

    @Test
    void isMessageProcessedForAccount_shouldReturnFalseWhenNotProcessedForAccount() {
        when(repository.isMessageProcessedForAccount("test-message-123", "9999")).thenReturn(false);

        boolean result = service.isMessageProcessedForAccount("test-message-123", "9999");

        assertFalse(result);
        verify(repository).isMessageProcessedForAccount("test-message-123", "9999");
    }

    // Tests for getUnprocessedAccountsForEmail()
    @Test
    void getUnprocessedAccountsForEmail_shouldReturnAllAccountsWhenEmailNotProcessed() {
        when(repository.findByMessageId("new-message")).thenReturn(Optional.empty());

        Set<String> result = service.getUnprocessedAccountsForEmail("new-message", testAccountNumbers);

        assertEquals(testAccountNumbers, result);
        verify(repository).findByMessageId("new-message");
    }

    @Test
    void getUnprocessedAccountsForEmail_shouldReturnUnprocessedAccountsOnly() {
        when(repository.findByMessageId("test-message-123")).thenReturn(Optional.of(testMessage));

        Set<String> result = service.getUnprocessedAccountsForEmail("test-message-123", testAccountNumbers);

        assertEquals(1, result.size());
        assertTrue(result.contains("9999"));
        assertFalse(result.contains("1234"));
        assertFalse(result.contains("5678"));
    }

    @Test
    void getUnprocessedAccountsForEmail_shouldReturnEmptySetWhenAllAccountsProcessed() {
        Set<String> processedAccounts = Set.of("1234", "5678");
        when(repository.findByMessageId("test-message-123")).thenReturn(Optional.of(testMessage));

        Set<String> result = service.getUnprocessedAccountsForEmail("test-message-123", processedAccounts);

        assertTrue(result.isEmpty());
    }

    // Tests for findLatestMessageDateTime()
    @Test
    void findLatestMessageDateTime_shouldReturnLatestDateTime() {
        LocalDateTime expectedDateTime = LocalDateTime.now().minusDays(1);
        when(repository.findLatestMessageDateTime()).thenReturn(Optional.of(expectedDateTime));

        Optional<LocalDateTime> result = service.findLatestMessageDateTime();

        assertTrue(result.isPresent());
        assertEquals(expectedDateTime, result.get());
        verify(repository).findLatestMessageDateTime();
    }

    @Test
    void findLatestMessageDateTime_shouldReturnEmptyWhenNoMessages() {
        when(repository.findLatestMessageDateTime()).thenReturn(Optional.empty());

        Optional<LocalDateTime> result = service.findLatestMessageDateTime();

        assertFalse(result.isPresent());
        verify(repository).findLatestMessageDateTime();
    }

    // Tests for findLatestMessageDateTimeForAccount()
    @Test
    void findLatestMessageDateTimeForAccount_shouldReturnLatestDateTimeForAccount() {
        LocalDateTime expectedDateTime = LocalDateTime.now().minusDays(2);
        when(repository.findLatestMessageDateTimeForAccount("1234")).thenReturn(Optional.of(expectedDateTime));

        Optional<LocalDateTime> result = service.findLatestMessageDateTimeForAccount("1234");

        assertTrue(result.isPresent());
        assertEquals(expectedDateTime, result.get());
        verify(repository).findLatestMessageDateTimeForAccount("1234");
    }

    // Tests for markEmailProcessedForAccounts() - New Message
    @Test
    void markEmailProcessedForAccounts_shouldCreateNewMessageRecord() {
        when(repository.findByMessageId("new-message")).thenReturn(Optional.empty());
        when(repository.save(any(ProcessedGmailMessage.class))).thenReturn(testMessage);

        service.markEmailProcessedForAccounts("new-message", Set.of("1234", "5678"), testDateTime, 2);

        verify(repository).findByMessageId("new-message");
        verify(repository).save(argThat(message -> 
            message.getMessageId().equals("new-message") &&
            message.getProcessedAccountNumbers().contains("1234") &&
            message.getProcessedAccountNumbers().contains("5678") &&
            message.getTransactionCount() == 2
        ));
    }

    // Tests for markEmailProcessedForAccounts() - Update Existing Message
    @Test
    void markEmailProcessedForAccounts_shouldUpdateExistingMessageRecord() {
        ProcessedGmailMessage existingMessage = ProcessedGmailMessage.builder()
                .id(1L)
                .messageId("test-message-123")
                .processedAccountNumbers(new HashSet<>(Set.of("1234")))
                .messageDateTime(testDateTime)
                .firstProcessedAt(testDateTime)
                .lastProcessedAt(testDateTime)
                .transactionCount(1)
                .build();

        when(repository.findByMessageId("test-message-123")).thenReturn(Optional.of(existingMessage));
        when(repository.save(any(ProcessedGmailMessage.class))).thenReturn(existingMessage);

        service.markEmailProcessedForAccounts("test-message-123", Set.of("5678", "9999"), testDateTime, 2);

        verify(repository).findByMessageId("test-message-123");
        verify(repository).save(argThat(message -> 
            message.getProcessedAccountNumbers().contains("1234") && // Original account preserved
            message.getProcessedAccountNumbers().contains("5678") && // New account added
            message.getProcessedAccountNumbers().contains("9999") && // New account added
            message.getTransactionCount() == 3 // Original 1 + new 2
        ));
    }

    @Test
    void markEmailProcessedForAccounts_shouldNotUpdateWhenAllAccountsAlreadyProcessed() {
        when(repository.findByMessageId("test-message-123")).thenReturn(Optional.of(testMessage));

        service.markEmailProcessedForAccounts("test-message-123", Set.of("1234", "5678"), testDateTime, 1);

        verify(repository).findByMessageId("test-message-123");
        verify(repository, never()).save(any());
    }

    @Test
    void markEmailProcessedForAccounts_shouldHandleNullMessageId() {
        service.markEmailProcessedForAccounts(null, Set.of("1234"), testDateTime, 1);

        verify(repository, never()).findByMessageId(any());
        verify(repository, never()).save(any());
    }

    @Test
    void markEmailProcessedForAccounts_shouldHandleEmptyMessageId() {
        service.markEmailProcessedForAccounts("", Set.of("1234"), testDateTime, 1);

        verify(repository, never()).findByMessageId(any());
        verify(repository, never()).save(any());
    }

    @Test
    void markEmailProcessedForAccounts_shouldHandleNullAccountNumbers() {
        service.markEmailProcessedForAccounts("test-message", null, testDateTime, 1);

        verify(repository, never()).findByMessageId(any());
        verify(repository, never()).save(any());
    }

    @Test
    void markEmailProcessedForAccounts_shouldHandleEmptyAccountNumbers() {
        service.markEmailProcessedForAccounts("test-message", Set.of(), testDateTime, 1);

        verify(repository, never()).findByMessageId(any());
        verify(repository, never()).save(any());
    }

    @Test
    void markEmailProcessedForAccounts_shouldHandleNullMessageDateTime() {
        service.markEmailProcessedForAccounts("test-message", Set.of("1234"), null, 1);

        verify(repository, never()).findByMessageId(any());
        verify(repository, never()).save(any());
    }

    // Tests for markEmailProcessedForAccount() convenience method
    @Test
    void markEmailProcessedForAccount_shouldCallMainMethodWithSingleAccount() {
        when(repository.findByMessageId("test-message")).thenReturn(Optional.empty());
        when(repository.save(any(ProcessedGmailMessage.class))).thenReturn(testMessage);

        service.markEmailProcessedForAccount("test-message", "1234", testDateTime, 1);

        verify(repository).save(argThat(message -> 
            message.getProcessedAccountNumbers().size() == 1 &&
            message.getProcessedAccountNumbers().contains("1234")
        ));
    }

    // Tests for deprecated methods to ensure backward compatibility
    @Test
    void isMessageProcessed_deprecatedMethod_shouldCallNewMethod() {
        when(repository.isMessageProcessedForAccount("test-message", "1234")).thenReturn(true);

        boolean result = service.isMessageProcessed("test-message", "1234");

        assertTrue(result);
        verify(repository).isMessageProcessedForAccount("test-message", "1234");
    }

    @Test
    void findLatestMessageDateTime_deprecatedMethod_shouldCallNewMethod() {
        LocalDateTime expectedDateTime = LocalDateTime.now();
        when(repository.findLatestMessageDateTimeForAccount("1234")).thenReturn(Optional.of(expectedDateTime));

        Optional<LocalDateTime> result = service.findLatestMessageDateTime("1234");

        assertTrue(result.isPresent());
        assertEquals(expectedDateTime, result.get());
        verify(repository).findLatestMessageDateTimeForAccount("1234");
    }

    @Test
    void saveProcessedMessage_deprecatedMethod_shouldCallNewMethod() {
        when(repository.findByMessageId("test-message")).thenReturn(Optional.empty());
        when(repository.save(any(ProcessedGmailMessage.class))).thenReturn(testMessage);

        service.saveProcessedMessage("test-message", "1234", testDateTime);

        verify(repository).save(argThat(message -> 
            message.getMessageId().equals("test-message") &&
            message.getProcessedAccountNumbers().contains("1234") &&
            message.getTransactionCount() == 0 // Deprecated method passes 0 for transaction count
        ));
    }
}