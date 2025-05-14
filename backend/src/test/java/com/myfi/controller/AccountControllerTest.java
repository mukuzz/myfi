package com.myfi.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfi.model.Account;
import com.myfi.model.Account.AccountType;
import com.myfi.service.AccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@WebMvcTest(AccountController.class)
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AccountService accountService;

    @Autowired
    private ObjectMapper objectMapper; // For converting objects to JSON

    private Account account1;
    private Account account2;

    @BeforeEach
    void setUp() {
        account1 = new Account();
        account1.setId(1L);
        account1.setName("Savings Account");
        account1.setType(AccountType.SAVINGS);
        account1.setBalance(BigDecimal.valueOf(1000));
        account1.setCurrency("INR");
        account1.setAccountNumber("12345");
        account1.setActive(true);

        account2 = new Account();
        account2.setId(2L);
        account2.setName("Credit Card");
        account2.setType(AccountType.CREDIT_CARD);
        account2.setBalance(BigDecimal.valueOf(-500));
        account2.setCurrency("INR");
        account2.setAccountNumber("67890");
        account2.setActive(true);
    }

    @Test
    void getAllAccounts_shouldReturnListOfAccounts() throws Exception {
        given(accountService.getAllAccounts()).willReturn(Arrays.asList(account1, account2));

        mockMvc.perform(get("/api/v1/accounts"))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$", hasSize(2)))
               .andExpect(jsonPath("$[0].name", is("Savings Account")))
               .andExpect(jsonPath("$[1].name", is("Credit Card")));
    }

    @Test
    void getAccountById_shouldReturnAccountWhenFound() throws Exception {
        given(accountService.getAccountById(1L)).willReturn(Optional.of(account1));

        mockMvc.perform(get("/api/v1/accounts/{id}", 1L))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.id", is(1)))
               .andExpect(jsonPath("$.name", is("Savings Account")));
    }

    @Test
    void getAccountById_shouldReturnNotFoundWhenMissing() throws Exception {
        given(accountService.getAccountById(99L)).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/accounts/{id}", 99L))
               .andExpect(status().isNotFound());
    }

    @Test
    void createAccount_shouldReturnCreatedAccount() throws Exception {
        Account newAccount = new Account();
        newAccount.setName("New Checking");
        newAccount.setType(AccountType.SAVINGS); // Using SAVINGS as CHECKING not available
        newAccount.setBalance(BigDecimal.ZERO);
        newAccount.setCurrency("USD");
        newAccount.setAccountNumber("55555");

        Account savedAccount = new Account(); // Simulate the saved account with ID
        savedAccount.setId(3L);
        savedAccount.setName(newAccount.getName());
        savedAccount.setType(newAccount.getType());
        savedAccount.setBalance(newAccount.getBalance());
        savedAccount.setCurrency(newAccount.getCurrency());
        savedAccount.setAccountNumber(newAccount.getAccountNumber());
        savedAccount.setActive(true);

        given(accountService.createAccount(any(Account.class))).willReturn(savedAccount);

        mockMvc.perform(post("/api/v1/accounts")
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(newAccount)))
               .andExpect(status().isCreated()) // Expect 201 Created
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.id", is(3)))
               .andExpect(jsonPath("$.name", is("New Checking")));
    }

    @Test
    void createAccount_shouldReturnBadRequestWhenServiceThrowsException() throws Exception {
        Account invalidAccount = new Account(); // Missing required fields
        invalidAccount.setName("Invalid");

        given(accountService.createAccount(any(Account.class))).willThrow(new IllegalArgumentException("Missing fields"));

        mockMvc.perform(post("/api/v1/accounts")
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(invalidAccount)))
               .andExpect(status().isBadRequest());
    }

    @Test
    void updateAccount_shouldReturnUpdatedAccountWhenFound() throws Exception {
        Account accountDetails = new Account();
        accountDetails.setName("Updated Savings");
        accountDetails.setType(AccountType.SAVINGS);
        accountDetails.setBalance(BigDecimal.valueOf(1200));
        accountDetails.setCurrency("INR");
        accountDetails.setAccountNumber("12345-New");
        accountDetails.setActive(false);

        Account updatedAccount = new Account();
        updatedAccount.setId(1L);
        updatedAccount.setName(accountDetails.getName());
        updatedAccount.setType(accountDetails.getType());
        updatedAccount.setBalance(accountDetails.getBalance());
        updatedAccount.setCurrency(accountDetails.getCurrency());
        updatedAccount.setAccountNumber(accountDetails.getAccountNumber());
        updatedAccount.setActive(accountDetails.isActive());

        given(accountService.updateAccount(eq(1L), any(Account.class))).willReturn(Optional.of(updatedAccount));

        mockMvc.perform(put("/api/v1/accounts/{id}", 1L)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(accountDetails)))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.id", is(1)))
               .andExpect(jsonPath("$.name", is("Updated Savings")))
               .andExpect(jsonPath("$.active", is(false)));
    }

    @Test
    void updateAccount_shouldReturnNotFoundWhenMissing() throws Exception {
        Account accountDetails = new Account();
        accountDetails.setName("NonExistent");

        given(accountService.updateAccount(eq(99L), any(Account.class))).willReturn(Optional.empty());

        mockMvc.perform(put("/api/v1/accounts/{id}", 99L)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(accountDetails)))
               .andExpect(status().isNotFound());
    }

    @Test
    void deleteAccount_shouldReturnNoContentWhenSuccessful() throws Exception {
        given(accountService.deleteAccount(1L)).willReturn(true);

        mockMvc.perform(delete("/api/v1/accounts/{id}", 1L))
               .andExpect(status().isNoContent()); // Expect 204 No Content
    }

    @Test
    void deleteAccount_shouldReturnNotFoundWhenMissing() throws Exception {
        given(accountService.deleteAccount(99L)).willReturn(false);

        mockMvc.perform(delete("/api/v1/accounts/{id}", 99L))
               .andExpect(status().isNotFound());
    }

     @Test
    void getSupportedAccounts_shouldReturnMap() throws Exception {
        Map<AccountType, List<String>> supportedMap = new HashMap<>();
        supportedMap.put(AccountType.SAVINGS, Arrays.asList("BankA", "BankB"));
        supportedMap.put(AccountType.CREDIT_CARD, Collections.singletonList("BankA"));

        given(accountService.getSupportedAccounts()).willReturn(supportedMap);

        mockMvc.perform(get("/api/v1/accounts/supported"))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.SAVINGS", hasSize(2)))
               .andExpect(jsonPath("$.SAVINGS[0]", is("BankA")))
               .andExpect(jsonPath("$.CREDIT_CARD", hasSize(1)))
               .andExpect(jsonPath("$.CREDIT_CARD[0]", is("BankA")));
    }
} 