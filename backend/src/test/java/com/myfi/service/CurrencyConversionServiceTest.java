package com.myfi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfi.credentials.service.CredentialsService;
import com.myfi.mailscraping.constants.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class CurrencyConversionServiceTest {

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private CredentialsService credentialsService;

    @InjectMocks
    private CurrencyConversionService currencyConversionService;

    @Mock
    private RestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testConvertToINR_AlreadyINR() {
        BigDecimal amount = new BigDecimal("100.00");
        String currency = "INR";
        LocalDate date = LocalDate.of(2024, 1, 15);

        BigDecimal result = currencyConversionService.convertToINR(amount, currency, date);

        assertEquals(amount, result);
    }

    @Test
    void testConvertToINR_NullAmount() {
        BigDecimal result = currencyConversionService.convertToINR(null, "USD", LocalDate.now());
        assertNull(result);
    }

    @Test
    void testConvertToINR_NullCurrency() {
        BigDecimal amount = new BigDecimal("100.00");
        BigDecimal result = currencyConversionService.convertToINR(amount, null, LocalDate.now());
        assertEquals(amount, result);
    }

    @Test
    void testConvertToINR_fromUSD() {
        BigDecimal amount = new BigDecimal("100.00");
        BigDecimal result = currencyConversionService.convertToINR(amount, "USD", LocalDate.of(2024, 1, 15));
        assertEquals(BigDecimal.valueOf(8285.97), result);
    }

    @Test
    void testConvertToINR_NoApiKey() throws Exception {
        // Mock no API key available
        when(credentialsService.getCredential(eq(Constants.OPEN_EXCHANGE_RATES_API_KEY_KEY)))
                .thenReturn(null);
        
        BigDecimal amount = new BigDecimal("100.00");
        BigDecimal result = currencyConversionService.convertToINR(amount, "USD", LocalDate.of(2024, 1, 15));
        
        // Should return original amount when API key is not available
        assertEquals(amount, result);
    }

    @Test
    void testIsValidCurrencyCode_Valid() {
        assertTrue(currencyConversionService.isValidCurrencyCode("USD"));
        assertTrue(currencyConversionService.isValidCurrencyCode("EUR"));
        assertTrue(currencyConversionService.isValidCurrencyCode("GBP"));
        assertTrue(currencyConversionService.isValidCurrencyCode("INR"));
    }

    @Test
    void testIsValidCurrencyCode_Invalid() {
        assertFalse(currencyConversionService.isValidCurrencyCode(null));
        assertFalse(currencyConversionService.isValidCurrencyCode(""));
        assertFalse(currencyConversionService.isValidCurrencyCode("US"));
        assertFalse(currencyConversionService.isValidCurrencyCode("USDD"));
        assertFalse(currencyConversionService.isValidCurrencyCode("123"));
        assertFalse(currencyConversionService.isValidCurrencyCode("U$D"));
    }

    @Test
    void testConvertToINR_CaseInsensitive() {
        BigDecimal amount = new BigDecimal("100.00");
        
        // Test lowercase
        BigDecimal result1 = currencyConversionService.convertToINR(amount, "inr", LocalDate.now());
        assertEquals(amount, result1);
        
        // Test mixed case
        BigDecimal result2 = currencyConversionService.convertToINR(amount, "Inr", LocalDate.now());
        assertEquals(amount, result2);
    }

    @Test
    void testConvertToINR_WithSpaces() {
        BigDecimal amount = new BigDecimal("100.00");
        BigDecimal result = currencyConversionService.convertToINR(amount, " INR ", LocalDate.now());
        assertEquals(amount, result);
    }
}