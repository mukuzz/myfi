package com.myfi.mailscraping.service;

import com.google.api.services.gmail.model.Message;
import com.google.api.services.gmail.model.MessagePart;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class EmailParser {

    private static final Logger logger = LoggerFactory.getLogger(EmailParser.class);

    /**
     * Extracts clean text content from a Gmail message.
     * It prioritizes HTML content and cleans it using Jsoup, falling back to plain text.
     *
     * @param message The Gmail Message object.
     * @return The extracted plain text, or null if no suitable content is found or decoding fails.
     */
    public String extractTextFromMessage(Message message) {
        MessagePart payload = message.getPayload();
        if (payload == null) {
            logger.warn("Message payload is null for message ID: {}", message.getId());
            return null;
        }

        String htmlBody = findBodyByMimeType(payload, "text/html");
        if (htmlBody != null) {
            String decodedHtml = decodeBase64Url(htmlBody);
            if (decodedHtml != null) {
                logger.debug("Found HTML body for message ID: {}", message.getId());
                // Use Jsoup to clean the HTML and get text
                // Safelist.none() removes all HTML tags
                String plainText = Jsoup.clean(decodedHtml, Safelist.none());
                // Optional: Basic whitespace cleanup if needed
                return plainText.replaceAll("\s+", " ").trim();
            }
        }

        String plainTextBody = findBodyByMimeType(payload, "text/plain");
        if (plainTextBody != null) {
            String decodedText = decodeBase64Url(plainTextBody);
            if (decodedText != null) {
                 logger.debug("Found Plain Text body for message ID: {}", message.getId());
                 return decodedText.trim(); // Return decoded plain text directly
            }
        }

        logger.warn("No suitable text/html or text/plain body found or could be decoded for message ID: {}", message.getId());
        return null; // No suitable content found
    }

    /**
     * Recursively searches message parts for the first part matching the given MIME type.
     *
     * @param part     The current MessagePart to search within.
     * @param mimeType The desired MIME type (e.g., "text/plain", "text/html").
     * @return The Base64 encoded data of the found part, or null if not found.
     */
    private String findBodyByMimeType(MessagePart part, String mimeType) {
        // Check if current part matches the requested MIME type
        if (mimeType.equals(part.getMimeType()) && part.getBody() != null && part.getBody().getData() != null) {
            return part.getBody().getData();
        }

        // If this part has sub-parts, search through them
        if (part.getParts() != null) {
            // Collect all matching parts
            List<String> matchingParts = new ArrayList<>();
            
            for (MessagePart subPart : part.getParts()) {
                String foundData = findBodyByMimeType(subPart, mimeType);
                if (foundData != null) {
                    matchingParts.add(foundData);
                }
            }
            
            // If we found multiple matching parts, concatenate them
            if (!matchingParts.isEmpty()) {
                if (matchingParts.size() == 1) {
                    return matchingParts.get(0);
                } else {
                    logger.debug("Found {} parts with MIME type {}, concatenating them", matchingParts.size(), mimeType);
                    return String.join("\n", matchingParts);
                }
            }
        }
        return null;
    }


    /**
     * Decodes a Base64Url encoded string.
     *
     * @param base64UrlString The Base64Url encoded string.
     * @return The decoded string, or null if input is null or decoding fails.
     */
    private String decodeBase64Url(String base64UrlString) {
        if (base64UrlString == null) {
            return null;
        }
        try {
            byte[] decodedBytes = Base64.getUrlDecoder().decode(base64UrlString);
            return new String(decodedBytes, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            logger.error("Failed to decode Base64Url string: {}", e.getMessage());
            return null;
        }
    }
}
