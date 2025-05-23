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
          "type": {
            "type": "string",
            "enum": ["DEBIT", "CREDIT"],
            "description": "If the money is spent, then use 'DEBIT'. If the money is credited, then use 'CREDIT'."
          },
          "description": {
            "type": "string",
            "description": "Brief description of the transaction. Include merchant name if given in the email. Start the description with the merchant name."
          },
          "card_number": {
            "type": "string",
            "description": "The last 4 digits of the card number used for the transaction."
          },
          "is_credit_card_transaction": {
            "type": "boolean",
            "description": "true if the email is a credit card transaction, false if it's just a transaction notification or something else."
          },
          "is_pixel_card_transaction": {
            "type": "boolean",
            "description": "true if the card name is pixel card, false if it's not."
          },
          "is_credit_card_statement": {
            "type": "boolean",
            "description": "true if the email is a credit card statement, false if it's just a transaction notification or something else."
          },
          "is_transaction_successful": {
            "type": "boolean",
            "description": "true if the transaction is successful, false if it's a failed transaction."
          }
        },
        "required": ["amount", "transaction_date", "type", "description", "card_number", "is_credit_card_transaction", "is_pixel_card_transaction", "is_credit_card_statement", "is_transaction_successful"],
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
        .model("gpt-4.1-nano")
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
          || details.getTransactionDate() == null || details.getType() == null
          || details.getCardNumber() == null) {
        logger.warn("Parsed JSON details are incomplete: {}", details);
        return Optional.empty();
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
    private String type;
    private String description;
    @JsonProperty("card_number")
    private String cardNumber;
    @JsonProperty("is_credit_card_transaction")
    private boolean isCreditCardTransaction;
    @JsonProperty("is_pixel_card_transaction")
    private boolean isPixelCardTransaction;
    @JsonProperty("is_credit_card_statement")
    private boolean isCreditCardStatement;
    @JsonProperty("is_transaction_successful")
    private boolean isTransactionSuccessful;
  }

}