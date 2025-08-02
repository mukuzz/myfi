package com.myfi.mailscraping.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfi.credentials.service.CredentialsService;
import com.myfi.mailscraping.constants.Constants;
import com.myfi.mailscraping.enums.EmailType;
import com.myfi.mailscraping.service.OpenAIService.ExtractedDetailsFromEmail;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatModel;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OpenAIServiceTest {

    @Mock
    private CredentialsService credentialsService;

    @Mock
    private OpenAiChatModel chatModel;

    @Mock
    private ChatResponse chatResponse;

    @Mock
    private Generation generation;

    @Mock
    private AssistantMessage assistantMessage;

    @InjectMocks
    private OpenAIService openAIService;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws Exception {
        objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules(); // Register JavaTimeModule for LocalDate support
        
        // Use reflection to set the ObjectMapper since it's injected via constructor
        java.lang.reflect.Field objectMapperField = OpenAIService.class.getDeclaredField("objectMapper");
        objectMapperField.setAccessible(true);
        objectMapperField.set(openAIService, objectMapper);

        // Make credentials service stubbing lenient to avoid unnecessary stubbing errors
        lenient().when(credentialsService.getCredential(eq(Constants.OPENAI_API_KEY_KEY))).thenReturn("test-api-key");
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldReturnValidDetails_whenOpenAIReturnsValidJson() throws Exception {
        // Arrange
        String emailBody = "Your card ending in 1234 was charged $50.00 at Amazon on 15/01/2024. Transaction successful.";
        String validJsonResponse = """
            {
                "amount": 50.0,
                "currency_code": "USD",
                "transaction_date": "2024-01-15",
                "transaction_type": "DEBIT",
                "description": "Amazon purchase",
                "account_number": "1234",
                "email_type": "TRANSACTION_INFORMATION",
                "is_transaction_successful": true,
                "is_pixel_card_transaction": false
            }
            """;

        // Set up the chat model to be initialized
        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, chatModel);

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(assistantMessage);
        when(assistantMessage.getText()).thenReturn(validJsonResponse);

        // Act
        Optional<ExtractedDetailsFromEmail> result = openAIService.extractDetailsFromEmail(emailBody);

        // Assert
        assertTrue(result.isPresent());
        ExtractedDetailsFromEmail details = result.get();
        assertEquals(50.0, details.getAmount());
        assertEquals("USD", details.getCurrencyCode());
        assertEquals(LocalDate.of(2024, 1, 15), details.getTransactionDate());
        assertEquals("DEBIT", details.getTransactionType());
        assertEquals("Amazon purchase", details.getDescription());
        assertEquals("1234", details.getAccountNumber());
        assertEquals(EmailType.TRANSACTION_INFORMATION, details.getEmailType());
        assertTrue(details.isTransactionSuccessful());
        assertFalse(details.isPixelCardTransaction());

        verify(chatModel).call(any(Prompt.class));
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldTruncateAccountNumber_whenLongerThan4Digits() throws Exception {
        // Arrange
        String emailBody = "Transaction on card 123456789";
        String jsonResponseWithLongAccountNumber = """
            {
                "amount": 100.0,
                "currency_code": "INR",
                "transaction_date": "2024-01-15",
                "transaction_type": "DEBIT",
                "description": "Test transaction",
                "account_number": "123456789",
                "email_type": "TRANSACTION_INFORMATION",
                "is_transaction_successful": true,
                "is_pixel_card_transaction": false
            }
            """;

        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, chatModel);

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(assistantMessage);
        when(assistantMessage.getText()).thenReturn(jsonResponseWithLongAccountNumber);

        // Act
        Optional<ExtractedDetailsFromEmail> result = openAIService.extractDetailsFromEmail(emailBody);

        // Assert
        assertTrue(result.isPresent());
        assertEquals("6789", result.get().getAccountNumber()); // Should be last 4 digits
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldReturnEmpty_whenAccountNumberTooShort() throws Exception {
        // Arrange
        String emailBody = "Transaction on card 12";
        String jsonResponseWithShortAccountNumber = """
            {
                "amount": 100.0,
                "currency_code": "INR",
                "transaction_date": "2024-01-15",
                "transaction_type": "DEBIT",
                "description": "Test transaction",
                "account_number": "12",
                "email_type": "TRANSACTION_INFORMATION",
                "is_transaction_successful": true,
                "is_pixel_card_transaction": false
            }
            """;

        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, chatModel);

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(assistantMessage);
        when(assistantMessage.getText()).thenReturn(jsonResponseWithShortAccountNumber);

        // Act
        Optional<ExtractedDetailsFromEmail> result = openAIService.extractDetailsFromEmail(emailBody);

        // Assert
        assertFalse(result.isPresent());
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldReturnEmpty_whenOpenAIReturnsEmptyJson() throws Exception {
        // Arrange
        String emailBody = "Some email content";

        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, chatModel);

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(assistantMessage);
        when(assistantMessage.getText()).thenReturn("{}");

        // Act
        Optional<ExtractedDetailsFromEmail> result = openAIService.extractDetailsFromEmail(emailBody);

        // Assert
        assertFalse(result.isPresent());
        verify(chatModel).call(any(Prompt.class));
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldReturnEmpty_whenOpenAIReturnsNull() throws Exception {
        // Arrange
        String emailBody = "Some email content";

        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, chatModel);

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(assistantMessage);
        when(assistantMessage.getText()).thenReturn(null);

        // Act
        Optional<ExtractedDetailsFromEmail> result = openAIService.extractDetailsFromEmail(emailBody);

        // Assert
        assertFalse(result.isPresent());
        verify(chatModel).call(any(Prompt.class));
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldReturnEmpty_whenOpenAIReturnsBlankString() throws Exception {
        // Arrange
        String emailBody = "Some email content";

        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, chatModel);

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(assistantMessage);
        when(assistantMessage.getText()).thenReturn("   ");

        // Act
        Optional<ExtractedDetailsFromEmail> result = openAIService.extractDetailsFromEmail(emailBody);

        // Assert
        assertFalse(result.isPresent());
        verify(chatModel).call(any(Prompt.class));
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldReturnEmpty_whenJsonParsingFails() throws Exception {
        // Arrange
        String emailBody = "Some email content";
        String invalidJsonResponse = "{ invalid json }";

        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, chatModel);

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(assistantMessage);
        when(assistantMessage.getText()).thenReturn(invalidJsonResponse);

        // Act
        Optional<ExtractedDetailsFromEmail> result = openAIService.extractDetailsFromEmail(emailBody);

        // Assert
        assertFalse(result.isPresent());
        verify(chatModel).call(any(Prompt.class));
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldReturnEmpty_whenRequiredFieldsAreMissing() throws Exception {
        // Arrange
        String emailBody = "Some email content";
        String incompleteJsonResponse = """
            {
                "amount": 50.0,
                "transaction_type": "DEBIT"
            }
            """;

        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, chatModel);

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(assistantMessage);
        when(assistantMessage.getText()).thenReturn(incompleteJsonResponse);

        // Act
        Optional<ExtractedDetailsFromEmail> result = openAIService.extractDetailsFromEmail(emailBody);

        // Assert
        assertFalse(result.isPresent());
        verify(chatModel).call(any(Prompt.class));
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldReturnEmpty_whenOpenAIApiThrowsException() throws Exception {
        // Arrange
        String emailBody = "Some email content";

        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, chatModel);

        when(chatModel.call(any(Prompt.class))).thenThrow(new RuntimeException("OpenAI API error"));

        // Act
        Optional<ExtractedDetailsFromEmail> result = openAIService.extractDetailsFromEmail(emailBody);

        // Assert
        assertFalse(result.isPresent());
        verify(chatModel).call(any(Prompt.class));
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldInitializeChatModel_whenChatModelIsNull() throws Exception {
        // Arrange
        String emailBody = "Your card ending in 1234 was charged $50.00 at Amazon on 15/01/2024. Transaction successful.";
        String validJsonResponse = """
            {
                "amount": 50.0,
                "currency_code": "USD",
                "transaction_date": "2024-01-15",
                "transaction_type": "DEBIT",
                "description": "Amazon purchase",
                "account_number": "1234",
                "email_type": "TRANSACTION_INFORMATION",
                "is_transaction_successful": true,
                "is_pixel_card_transaction": false
            }
            """;

        // Ensure chatModel is null initially (this is the default state)
        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, null);

        // Create a spy to mock the initialization method
        OpenAIService spyService = spy(openAIService);
        
        // Mock the initializeChatModel method to set our mock chatModel
        doAnswer(invocation -> {
            chatModelField.set(spyService, chatModel);
            return null;
        }).when(spyService).initializeChatModel();

        // Mock the actual method call to return our mock chatModel
        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(assistantMessage);
        when(assistantMessage.getText()).thenReturn(validJsonResponse);

        // Act
        Optional<ExtractedDetailsFromEmail> result = spyService.extractDetailsFromEmail(emailBody);

        // Assert
        assertTrue(result.isPresent());
        ExtractedDetailsFromEmail details = result.get();
        assertEquals(50.0, details.getAmount());
        assertEquals("1234", details.getAccountNumber());
        
        // Verify that the initializeChatModel method was called
        verify(spyService).initializeChatModel();
        
        // Verify that the chatModel was initialized (it should not be null after the call)
        Object chatModelAfterCall = chatModelField.get(spyService);
        assertNotNull(chatModelAfterCall);
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldHandlePixelCardTransaction() throws Exception {
        // Arrange
        String emailBody = "Your Pixel card ending in 5678 was charged $25.50 at Starbucks on 20/01/2024.";
        String pixelCardJsonResponse = """
            {
                "amount": 25.5,
                "currency_code": "INR",
                "transaction_date": "2024-01-20",
                "transaction_type": "DEBIT",
                "description": "Starbucks purchase",
                "account_number": "5678",
                "email_type": "TRANSACTION_INFORMATION",
                "is_transaction_successful": true,
                "is_pixel_card_transaction": true
            }
            """;

        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, chatModel);

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(assistantMessage);
        when(assistantMessage.getText()).thenReturn(pixelCardJsonResponse);

        // Act
        Optional<ExtractedDetailsFromEmail> result = openAIService.extractDetailsFromEmail(emailBody);

        // Assert
        assertTrue(result.isPresent());
        ExtractedDetailsFromEmail details = result.get();
        assertEquals(25.5, details.getAmount());
        assertEquals("5678", details.getAccountNumber());
        assertTrue(details.isPixelCardTransaction());
        assertTrue(details.isTransactionSuccessful());
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldHandleFailedTransaction() throws Exception {
        // Arrange
        String emailBody = "Transaction failed: Your card ending in 9999 could not be charged $100.00 at Amazon on 22/01/2024.";
        String failedTransactionJsonResponse = """
            {
                "amount": 100.0,
                "currency_code": "INR",
                "transaction_date": "2024-01-22",
                "transaction_type": "DEBIT",
                "description": "Amazon purchase - FAILED",
                "account_number": "9999",
                "email_type": "TRANSACTION_INFORMATION",
                "is_transaction_successful": false,
                "is_pixel_card_transaction": false
            }
            """;

        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, chatModel);

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(assistantMessage);
        when(assistantMessage.getText()).thenReturn(failedTransactionJsonResponse);

        // Act
        Optional<ExtractedDetailsFromEmail> result = openAIService.extractDetailsFromEmail(emailBody);

        // Assert
        assertTrue(result.isPresent());
        ExtractedDetailsFromEmail details = result.get();
        assertEquals(100.0, details.getAmount());
        assertEquals("9999", details.getAccountNumber());
        assertFalse(details.isTransactionSuccessful());
        assertFalse(details.isPixelCardTransaction());
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldHandleDifferentEmailTypes() throws Exception {
        // Arrange
        String emailBody = "Your credit card statement is ready. Total amount due: $500.00";
        String statementJsonResponse = """
            {
                "amount": 500.0,
                "currency_code": "INR",
                "transaction_date": "2024-01-25",
                "transaction_type": "DEBIT",
                "description": "Credit card statement",
                "account_number": "1111",
                "email_type": "CREDIT_CARD_STATEMENT_INFORMATION",
                "is_transaction_successful": true,
                "is_pixel_card_transaction": false
            }
            """;

        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, chatModel);

        when(chatModel.call(any(Prompt.class))).thenReturn(chatResponse);
        when(chatResponse.getResult()).thenReturn(generation);
        when(generation.getOutput()).thenReturn(assistantMessage);
        when(assistantMessage.getText()).thenReturn(statementJsonResponse);

        // Act
        Optional<ExtractedDetailsFromEmail> result = openAIService.extractDetailsFromEmail(emailBody);

        // Assert
        assertTrue(result.isPresent());
        ExtractedDetailsFromEmail details = result.get();
        assertEquals(EmailType.CREDIT_CARD_STATEMENT_INFORMATION, details.getEmailType());
        assertEquals(500.0, details.getAmount());
    }

    @Test
    void extractTransactionDetailsFromEmail_shouldThrowException_whenCredentialsServiceFails() throws Exception {
        // Arrange
        String emailBody = "Some email content";

        // Ensure chatModel is null to trigger initialization
        java.lang.reflect.Field chatModelField = OpenAIService.class.getDeclaredField("chatModel");
        chatModelField.setAccessible(true);
        chatModelField.set(openAIService, null);

        // Set up the credentials service field using reflection
        java.lang.reflect.Field credentialsServiceField = OpenAIService.class.getDeclaredField("credentialsService");
        credentialsServiceField.setAccessible(true);
        credentialsServiceField.set(openAIService, credentialsService);

        // Override the lenient stubbing for this specific test
        lenient().when(credentialsService.getCredential(eq(Constants.OPENAI_API_KEY_KEY)))
            .thenThrow(new RuntimeException("Credentials service error"));

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            openAIService.extractDetailsFromEmail(emailBody);
        });
    }
} 