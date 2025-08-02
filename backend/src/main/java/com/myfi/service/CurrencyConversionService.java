package com.myfi.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfi.credentials.service.CredentialsService;
import com.myfi.mailscraping.constants.Constants;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class CurrencyConversionService {
    
    private static final Logger logger = LoggerFactory.getLogger(CurrencyConversionService.class);
    private static final String BASE_CURRENCY = "INR";
    private static final String OPEN_EXCHANGE_RATES_HISTORICAL_URL = "https://openexchangerates.org/api/historical";
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private CredentialsService credentialsService;

    private final RestTemplate restTemplate = new RestTemplate();
    
    /**
     * Converts amount from source currency to INR on the specified date
     * @param amount The amount to convert
     * @param sourceCurrency The source currency code (e.g., "USD", "EUR")
     * @param date The date for historical exchange rate
     * @return The converted amount in INR, or the original amount if conversion fails or currency is already INR
     */
    public BigDecimal convertToINR(BigDecimal amount, String sourceCurrency, LocalDate date) {
        if (amount == null || sourceCurrency == null) {
            logger.warn("Invalid input: amount={}, sourceCurrency={}", amount, sourceCurrency);
            return amount;
        }
        
        // If already in INR, return the original amount
        if (BASE_CURRENCY.equalsIgnoreCase(sourceCurrency.trim())) {
            return amount;
        }
        
        try {
            BigDecimal exchangeRate = getHistoricalExchangeRate(sourceCurrency, date);
            if (exchangeRate == null || exchangeRate.compareTo(BigDecimal.ZERO) <= 0) {
                logger.warn("Invalid exchange rate for {} to {} on {}: {}", sourceCurrency, BASE_CURRENCY, date, exchangeRate);
                return amount;
            }
            
            BigDecimal convertedAmount = amount.multiply(exchangeRate).setScale(2, RoundingMode.HALF_UP);
            logger.info("Converted {} {} to {} INR on {} (rate: {})", 
                    amount, sourceCurrency, convertedAmount, date, exchangeRate);
            return convertedAmount;
            
        } catch (Exception e) {
            logger.error("Error converting {} {} to INR on {}: {}", amount, sourceCurrency, date, e.getMessage(), e);
            return amount; // Return original amount if conversion fails
        }
    }
    
    /**
     * Gets historical exchange rate from source currency to INR
     * @param sourceCurrency The source currency code
     * @param date The date for historical rate
     * @return Exchange rate or null if not found
     */
    private BigDecimal getHistoricalExchangeRate(String sourceCurrency, LocalDate date) {
        try {
            String apiKey = credentialsService.getCredential(Constants.OPEN_EXCHANGE_RATES_API_KEY_KEY, null);
            if (apiKey == null || apiKey.trim().isEmpty()) {
                logger.warn("Open Exchange Rates API key not found. Cannot fetch exchange rates.");
                return null;
            }
            
            String dateStr = date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            String url = String.format("%s/%s.json?app_id=%s", OPEN_EXCHANGE_RATES_HISTORICAL_URL, dateStr, apiKey);
            
            logger.debug("Fetching exchange rate from Open Exchange Rates API for {}", dateStr);
            String response = restTemplate.getForObject(url, String.class);
            
            if (response == null || response.isEmpty()) {
                logger.warn("Empty response from Open Exchange Rates API for {}", date);
                return null;
            }
            
            OpenExchangeRatesResponse rateResponse = objectMapper.readValue(response, OpenExchangeRatesResponse.class);
            
            if (rateResponse.getRates() == null) {
                logger.warn("No rates found in response for {}", date);
                return null;
            }
            
            // Open Exchange Rates uses USD as base currency, so we need to convert
            // Formula: (1 USD = X INR) / (1 USD = Y SourceCurrency) = X/Y SourceCurrency = 1 INR
            // So: 1 SourceCurrency = X/Y INR
            
            Double usdToInrRate = rateResponse.getRates().get(BASE_CURRENCY);
            if (usdToInrRate == null) {
                logger.warn("INR rate not found in Open Exchange Rates response for {}", date);
                return null;
            }
            
            // If source currency is USD, direct conversion
            if ("USD".equalsIgnoreCase(sourceCurrency)) {
                return BigDecimal.valueOf(usdToInrRate);
            }
            
            Double usdToSourceRate = rateResponse.getRates().get(sourceCurrency.toUpperCase());
            if (usdToSourceRate == null) {
                logger.warn("{} rate not found in Open Exchange Rates response for {}", sourceCurrency, date);
                return null;
            }
            
            // Convert: 1 SourceCurrency = (USD to INR rate) / (USD to Source rate) INR
            BigDecimal exchangeRate = BigDecimal.valueOf(usdToInrRate / usdToSourceRate);
            return exchangeRate.setScale(6, RoundingMode.HALF_UP);
            
        } catch (Exception e) {
            logger.error("Error fetching exchange rate for {} to {} on {}: {}", 
                    sourceCurrency, BASE_CURRENCY, date, e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Validates if the currency code is in proper ISO 4217 format
     * @param currencyCode The currency code to validate
     * @return true if valid, false otherwise
     */
    public boolean isValidCurrencyCode(String currencyCode) {
        if (currencyCode == null || currencyCode.trim().length() != 3) {
            return false;
        }
        
        String currency = currencyCode.trim().toUpperCase();
        // Basic validation - check if it's all letters
        return currency.matches("[A-Z]{3}");
    }
    
    /**
     * Response class for Open Exchange Rates API
     */
    private static class OpenExchangeRatesResponse {
        @JsonProperty("disclaimer")
        private String disclaimer;
        
        @JsonProperty("license")
        private String license;
        
        @JsonProperty("timestamp")
        private Long timestamp;
        
        @JsonProperty("base")
        private String base;
        
        @JsonProperty("rates")
        private Map<String, Double> rates;
        
        public String getDisclaimer() { return disclaimer; }
        public void setDisclaimer(String disclaimer) { this.disclaimer = disclaimer; }
        
        public String getLicense() { return license; }
        public void setLicense(String license) { this.license = license; }
        
        public Long getTimestamp() { return timestamp; }
        public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }
        
        public String getBase() { return base; }
        public void setBase(String base) { this.base = base; }
        
        public Map<String, Double> getRates() { return rates; }
        public void setRates(Map<String, Double> rates) { this.rates = rates; }
    }
}