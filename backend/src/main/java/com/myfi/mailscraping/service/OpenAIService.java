package com.myfi.mailscraping.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfi.credentials.service.CredentialsService;
import com.myfi.mailscraping.constants.Constants;

import lombok.Builder;
import lombok.Data;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.openai.api.ResponseFormat;

@Service
public class OpenAIService {

  private static final Logger logger = LoggerFactory.getLogger(OpenAIService.class);

  private final ObjectMapper objectMapper;
  private OpenAiChatModel chatModel;

  @Autowired
  private CredentialsService credentialsService;

  // JSON Schema for ExtractedTransactionDetails
  private static final String TRANSACTION_DETAILS_SCHEMA = """
{
  "type": "object",
  "properties": {
    "amount": {
      "type": "number",
      "description": "Transaction amount as a numeric value."
    },
    "transaction_date": {
      "type": "string",
      "description": "Date of the transaction in ISO 8601 format. In the mail the dates are in the Indian date format. The Indian date format has the following order: day, month, year."
    },
    "transaction_type": {
      "type": "string",
      "enum": [
        "DEBIT",
        "CREDIT"
      ],
      "description": "If the money is spent or it's not clear what type of transaction it is, then use 'DEBIT'. If the money is credited or received, then use 'CREDIT'."
    },
    "description": {
      "type": "string",
      "description": "Description of the transaction. Start the description with the merchant name if available."
    },
    "account_number": {
      "type": "string",
      "description": "The card number or the account number used for the transaction."
    },
    "email_type": {
      "type": "string",
      "enum": [
        "TRANSACTION_INFORMATION",
        "CREDIT_CARD_STATEMENT_INFORMATION",
        "ACCOUNT_BALANCE_INFORMATION",
        "OTHER"
      ],
      "description": "Type of information that the email contains."
    },
    "is_transaction_successful": {
      "type": "boolean",
      "description": "true if the transaction is successful, false if it's a failed transaction."
    },
    "is_pixel_card_transaction": {
      "type": "boolean",
      "description": "true if the card name is pixel card, false if it's not."
    }
  },
  "required": [
    "amount",
    "transaction_date",
    "transaction_type",
    "description",
    "account_number",
    "email_type",
    "is_transaction_successful",
    "is_pixel_card_transaction"
  ],
  "additionalProperties": false
}
""";

  // System prompt template for extracting transaction details
  private final String systemPrompt = """
      Extract credit card transaction details from the given email body:
      """;

  @Autowired
  public OpenAIService(ObjectMapper objectMapper) { // Inject OpenAiChatModel
    this.objectMapper = objectMapper;
  }

  public void initializeChatModel() throws Exception {
    String apiKey = credentialsService.getCredential(Constants.OPENAI_API_KEY_KEY, null);
    
    OpenAiApi openAiApi = OpenAiApi.builder().apiKey(apiKey).build();
    this.chatModel = OpenAiChatModel.builder().openAiApi(openAiApi).build();
  }

  public Optional<ExtractedTransactionDetails> extractTransactionDetailsFromEmail(String emailBody) throws Exception {
    if (chatModel == null) {
      initializeChatModel();
    }

    SystemMessage systemMessage = new SystemMessage(systemPrompt);
    UserMessage userMessage = new UserMessage(emailBody);

    // Define OpenAI options with JSON schema response format
    OpenAiChatOptions options = OpenAiChatOptions.builder()
        .model("gpt-4.1-mini")
        .responseFormat(new ResponseFormat(ResponseFormat.Type.JSON_SCHEMA, TRANSACTION_DETAILS_SCHEMA))
        .build();

    // Create prompt with messages and options
    Prompt prompt = new Prompt(List.of(systemMessage, userMessage), options);

    try {
      logger.debug("Sending request to OpenAI via Spring AI with JSON schema enforcement...");
      ChatResponse response = chatModel.call(prompt);
      String jsonResponse = response.getResult().getOutput().getText();
      logger.debug("Received JSON response from OpenAI: {}", jsonResponse);

      if (jsonResponse == null || jsonResponse.isBlank() || jsonResponse.trim().equals("{}")) {
        logger.warn(
            "OpenAI returned an empty or invalid JSON response for email body. Cannot extract details.");
        return Optional.empty();
      }

      // Parse the JSON response using ObjectMapper
      ExtractedTransactionDetails details = objectMapper.readValue(jsonResponse,
          ExtractedTransactionDetails.class);

      // Basic validation after parsing
      if (details.getDescription() == null || details.getAmount() == null
          || details.getTransactionDate() == null || details.getTransactionType() == null
          || details.getAccountNumber() == null) {
        logger.warn("Parsed JSON details are incomplete: {}", details);
        return Optional.empty();
      }

      if (details.getAccountNumber() != null) {
        if (details.getAccountNumber().length() > 4) {
          details.setAccountNumber(details.getAccountNumber().substring(details.getAccountNumber().length() - 4));
        } else if (details.getAccountNumber().length() < 4) {
          logger.warn("Parsed JSON details are incomplete: {}", details);
          return Optional.empty();
        }
      }

      logger.info("Successfully parsed transaction details from OpenAI JSON response for: {}", details);
      return Optional.of(details);

    } catch (JsonProcessingException e) {
      // Catch parsing errors specifically
      logger.error("Failed to parse JSON response from OpenAI: {}. Response content might be invalid.",
          e.getMessage(), e);
      return Optional.empty();
    } catch (Exception e) { // Catch broader exceptions from Spring AI client
      logger.error("Error calling OpenAI API via Spring AI with JSON schema: {}", e.getMessage(), e);
      return Optional.empty();
    }
  }

  @Data
  @Builder
  public static class ExtractedTransactionDetails {
    private Double amount;
    @JsonProperty("transaction_date")
    private LocalDate transactionDate;
    @JsonProperty("transaction_type")
    private String transactionType;
    private String description;
    @JsonProperty("account_number")
    private String accountNumber;
    @JsonProperty("email_type")
    private String emailType;
    @JsonProperty("is_pixel_card_transaction")
    private boolean isPixelCardTransaction;
    @JsonProperty("is_transaction_successful")
    private boolean isTransactionSuccessful;
  }

}