package com.myfi.mailscraping.service;

import com.myfi.model.Account;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AccountMatchingService {

    private static final Logger logger = LoggerFactory.getLogger(AccountMatchingService.class);

    /**
     * Finds all accounts that match the given email content.
     * Uses multiple matching strategies to identify relevant accounts.
     *
     * @param emailContent The email content to analyze
     * @param accounts List of all accounts to match against
     * @return List of matching accounts
     */
    public List<Account> findMatchingAccounts(String emailContent, List<Account> accounts) {
        List<Account> matchingAccounts = new ArrayList<>();

        if (emailContent == null || emailContent.isBlank() || accounts == null || accounts.isEmpty()) {
            logger.warn("Invalid input for account matching: emailContent={}, accounts size={}", 
                emailContent != null ? "provided" : "null", accounts != null ? accounts.size() : 0);
            return matchingAccounts;
        }

        // Strategy 1: Match by account numbers (primary strategy)
        List<Account> accountNumberMatches = findAccountsByNumbers(emailContent, accounts);
        matchingAccounts.addAll(accountNumberMatches);

        // Strategy 2: Match by bank/institution name (fallback strategy)
        List<Account> bankNameMatches = findAccountsByBankName(emailContent, accounts);
        
        // Add bank name matches that weren't already matched by account number
        for (Account bankMatch : bankNameMatches) {
            if (!matchingAccounts.contains(bankMatch)) {
                matchingAccounts.add(bankMatch);
                logger.info("Added account {} via bank name matching (no account number found)", 
                    bankMatch.getName());
            }
        }

        logger.info("Found {} matching accounts for email content", matchingAccounts.size());
        
        return matchingAccounts;
    }

    /**
     * Matches accounts by finding account numbers in the email content.
     * Looks for last 4 digits of account numbers as commonly used in notifications.
     *
     * @param emailContent The email content to search
     * @param accounts List of accounts to match against
     * @return List of accounts whose numbers are mentioned in the email
     */
    public List<Account> findAccountsByNumbers(String emailContent, List<Account> accounts) {
        List<Account> matches = new ArrayList<>();
        String cleanContent = emailContent.toLowerCase().replaceAll("\\s+", " ");

        for (Account account : accounts) {
            if (account.getAccountNumber() == null || account.getAccountNumber().length() < 4) {
                continue;
            }

            String accountNumber = account.getAccountNumber();
            String lastFourDigits = accountNumber.substring(accountNumber.length() - 4);
            
            // Look for various patterns of account number representation
            List<String> patterns = generateAccountNumberPatterns(accountNumber, lastFourDigits);
            
            boolean found = false;
            for (String pattern : patterns) {
                if (cleanContent.contains(pattern.toLowerCase())) {
                    matches.add(account);
                    logger.debug("Account {} matched by pattern: {}", account.getName(), pattern);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                // Also try regex pattern for masked account numbers like XXXX1234
                Pattern maskedPattern = Pattern.compile("x{4,}" + Pattern.quote(lastFourDigits), Pattern.CASE_INSENSITIVE);
                if (maskedPattern.matcher(cleanContent).find()) {
                    matches.add(account);
                    logger.debug("Account {} matched by masked pattern", account.getName());
                }
            }
        }

        logger.debug("Found {} accounts by account number matching", matches.size());
        return matches;
    }

    /**
     * Matches accounts by institution/bank name mentioned in the email.
     * This is a fallback strategy when account numbers are not found.
     *
     * @param emailContent The email content to search
     * @param accounts List of accounts to match against
     * @return List of accounts whose bank names are mentioned in the email
     */
    public List<Account> findAccountsByBankName(String emailContent, List<Account> accounts) {
        List<Account> matches = new ArrayList<>();
        String cleanContent = emailContent.toLowerCase();

        for (Account account : accounts) {
            String accountName = account.getName().toLowerCase();
            
            // Create variations of the account name for matching
            List<String> nameVariations = generateBankNameVariations(accountName);
            
            for (String variation : nameVariations) {
                if (cleanContent.contains(variation)) {
                    matches.add(account);
                    logger.debug("Account {} matched by bank name variation: {}", account.getName(), variation);
                    break;
                }
            }
        }

        logger.debug("Found {} accounts by bank name matching", matches.size());
        return matches;
    }

    /**
     * Generates various patterns for account number matching.
     * Common patterns used in bank emails for account identification.
     */
    private List<String> generateAccountNumberPatterns(String fullAccountNumber, String lastFourDigits) {
        List<String> patterns = new ArrayList<>();
        
        // Full account number
        patterns.add(fullAccountNumber);
        
        // Last 4 digits
        patterns.add(lastFourDigits);
        
        // Common formats: ending with 1234, ends with 1234, etc.
        patterns.add("ending with " + lastFourDigits);
        patterns.add("ends with " + lastFourDigits);
        patterns.add("ending " + lastFourDigits);
        
        // Masked formats: XXXX1234, ****1234
        patterns.add("xxxx" + lastFourDigits);
        patterns.add("****" + lastFourDigits);
        
        // Spaced formats: 1 2 3 4
        String spacedLastFour = String.join(" ", lastFourDigits.split(""));
        patterns.add(spacedLastFour);
        
        return patterns;
    }

    /**
     * Generates variations of bank names for matching.
     * Handles common abbreviations and name formats.
     */
    private List<String> generateBankNameVariations(String bankName) {
        List<String> variations = new ArrayList<>();
        
        // Original name
        variations.add(bankName);
        
        // Common bank name mappings
        if (bankName.contains("hdfc")) {
            variations.add("hdfc");
            variations.add("hdfc bank");
            variations.add("housing development finance corporation");
        }
        
        if (bankName.contains("icici")) {
            variations.add("icici");
            variations.add("icici bank");
            variations.add("industrial credit and investment corporation");
        }
        
        if (bankName.contains("sbi")) {
            variations.add("sbi");
            variations.add("state bank");
            variations.add("state bank of india");
        }
        
        if (bankName.contains("axis")) {
            variations.add("axis");
            variations.add("axis bank");
        }
        
        if (bankName.contains("kotak")) {
            variations.add("kotak");
            variations.add("kotak mahindra");
            variations.add("kotak bank");
        }
        
        if (bankName.contains("onecard")) {
            variations.add("onecard");
            variations.add("one card");
            variations.add("federal bank");
        }
        
        // Remove duplicates and empty strings
        return variations.stream()
                .distinct()
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());
    }

    /**
     * Validates if the extracted account number is consistent with the matched account.
     * This can be used for additional validation after account matching.
     */
    public boolean validateAccountMatch(Account account, String extractedAccountNumber) {
        if (account == null) {
            return false;
        }

        // If no account number was extracted, consider it valid for special accounts
        if (extractedAccountNumber == null || extractedAccountNumber.isBlank()) {
            return true; // Let the calling code decide based on other criteria
        }

        // Check if the last 4 digits match
        if (account.getAccountNumber() != null && account.getAccountNumber().length() >= 4 && 
            extractedAccountNumber.length() >= 4) {
            String accountLast4 = account.getAccountNumber().substring(account.getAccountNumber().length() - 4);
            String extractedLast4 = extractedAccountNumber.substring(extractedAccountNumber.length() - 4);
            return accountLast4.equals(extractedLast4);
        }

        return true; // Default to true if we can't validate
    }

    /**
     * Validates if the email content is consistent with the matched account.
     * This overloaded method can be used for email content validation.
     */
    public boolean validateAccountMatchWithEmailContent(Account account, String emailContent) {
        if (account == null || emailContent == null) {
            return false;
        }

        // Check if account name appears in email
        String cleanContent = emailContent.toLowerCase();
        String accountName = account.getName().toLowerCase();
        
        return cleanContent.contains(accountName) || 
               findAccountsByNumbers(emailContent, List.of(account)).contains(account);
    }
}