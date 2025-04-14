package com.myfi.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfi.model.Account;
import com.myfi.model.Transaction;
import com.myfi.model.Transaction.TransactionType;
import com.myfi.service.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@WebMvcTest(TransactionController.class)
class TransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TransactionService transactionService;

    @Autowired
    private ObjectMapper objectMapper;

    private Transaction transaction1;
    private Transaction transaction2;
    private Account account;

    @BeforeEach
    void setUp() {
        account = new Account();
        account.setId(1L);
        account.setName("Test Account");

        transaction1 = new Transaction();
        transaction1.setId(1L);
        transaction1.setAmount(BigDecimal.valueOf(100.00));
        transaction1.setDescription("Debit Txn");
        transaction1.setType(TransactionType.DEBIT);
        transaction1.setTransactionDate(LocalDateTime.now().minusDays(1));
        transaction1.setAccount(account);
        transaction1.generateUniqueKey();

        transaction2 = new Transaction();
        transaction2.setId(2L);
        transaction2.setAmount(BigDecimal.valueOf(200.50));
        transaction2.setDescription("Credit Txn");
        transaction2.setType(TransactionType.CREDIT);
        transaction2.setTransactionDate(LocalDateTime.now());
        transaction2.setAccount(account);
        transaction2.generateUniqueKey();
    }

    @Test
    void getAllTransactions_shouldReturnListOfTransactions() throws Exception {
        Pageable pageable = PageRequest.of(0, 20);
        List<Transaction> transactionList = Arrays.asList(transaction1, transaction2);
        Page<Transaction> transactionPage = new PageImpl<>(transactionList, pageable, transactionList.size());

        given(transactionService.getAllTransactions(any(Pageable.class))).willReturn(transactionPage);

        mockMvc.perform(get("/api/v1/transactions")
                       .accept(MediaType.APPLICATION_JSON))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.content", hasSize(2)))
               .andExpect(jsonPath("$.content[0].description", is("Debit Txn")))
               .andExpect(jsonPath("$.content[1].description", is("Credit Txn")))
               .andExpect(jsonPath("$.totalPages", is(1)))
               .andExpect(jsonPath("$.totalElements", is(2)));
    }

    @Test
    void getTransactionsByAccountId_shouldReturnTransactions() throws Exception {
        given(transactionService.getTransactionsByAccountId(1L)).willReturn(Collections.singletonList(transaction1));

        mockMvc.perform(get("/api/v1/transactions/account/{accountId}", 1L))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$", hasSize(1)))
               .andExpect(jsonPath("$[0].id", is(1)));
    }

    @Test
    void getTransactionById_shouldReturnTransactionWhenFound() throws Exception {
        given(transactionService.getTransactionById(1L)).willReturn(Optional.of(transaction1));

        mockMvc.perform(get("/api/v1/transactions/{id}", 1L))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.id", is(1)))
               .andExpect(jsonPath("$.description", is("Debit Txn")));
    }

    @Test
    void getTransactionById_shouldReturnNotFoundWhenMissing() throws Exception {
        given(transactionService.getTransactionById(99L)).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/transactions/{id}", 99L))
               .andExpect(status().isNotFound());
    }

    @Test
    void createTransaction_shouldReturnCreatedTransaction() throws Exception {
        Transaction newTransaction = new Transaction(); // Input DTO
        newTransaction.setAmount(BigDecimal.TEN);
        newTransaction.setDescription("New Purchase");
        newTransaction.setType(TransactionType.DEBIT);
        newTransaction.setTransactionDate(LocalDateTime.now());
        newTransaction.setAccount(account); // Or just accountId if required

        Transaction savedTransaction = new Transaction(); // What service returns
        savedTransaction.setId(3L);
        savedTransaction.setAmount(newTransaction.getAmount());
        savedTransaction.setDescription(newTransaction.getDescription());
        savedTransaction.setType(newTransaction.getType());
        savedTransaction.setTransactionDate(newTransaction.getTransactionDate());
        savedTransaction.setAccount(newTransaction.getAccount());
        savedTransaction.setCreatedAt(LocalDateTime.now());
        savedTransaction.generateUniqueKey();

        given(transactionService.createTransaction(any(Transaction.class))).willReturn(savedTransaction);

        mockMvc.perform(post("/api/v1/transactions")
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(newTransaction)))
               .andExpect(status().isCreated())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.id", is(3)))
               .andExpect(jsonPath("$.description", is("New Purchase")));
    }

    @Test
    void createTransaction_shouldReturnBadRequestOnIllegalArgument() throws Exception {
        Transaction invalidTxn = new Transaction();
        String errorMessage = "Missing required field: amount";
        given(transactionService.createTransaction(any(Transaction.class))).willThrow(new IllegalArgumentException(errorMessage));

        mockMvc.perform(post("/api/v1/transactions")
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(invalidTxn)))
               .andExpect(status().isBadRequest())
               .andExpect(content().string(errorMessage));
    }

     @Test
    void createTransaction_shouldReturnInternalServerErrorOnGenericException() throws Exception {
        Transaction txn = new Transaction();
        given(transactionService.createTransaction(any(Transaction.class))).willThrow(new RuntimeException("Database error"));

        mockMvc.perform(post("/api/v1/transactions")
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(txn)))
               .andExpect(status().isInternalServerError())
               .andExpect(content().string("An unexpected error occurred."));
    }

    @Test
    void updateTransaction_shouldReturnUpdatedTransaction() throws Exception {
        Transaction updatedDetails = new Transaction();
        updatedDetails.setDescription("Updated Txn Description");
        updatedDetails.setAmount(BigDecimal.valueOf(150));

        Transaction savedUpdate = new Transaction(); // What service returns
        savedUpdate.setId(1L);
        savedUpdate.setDescription(updatedDetails.getDescription());
        savedUpdate.setAmount(updatedDetails.getAmount());
        savedUpdate.setType(transaction1.getType()); // Assume other fields remain
        savedUpdate.setTransactionDate(transaction1.getTransactionDate());
        savedUpdate.setUpdatedAt(LocalDateTime.now());
        savedUpdate.generateUniqueKey(); // Key might change

        given(transactionService.updateTransaction(eq(1L), any(Transaction.class))).willReturn(Optional.of(savedUpdate));

        mockMvc.perform(put("/api/v1/transactions/{id}", 1L)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(updatedDetails)))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.id", is(1)))
               .andExpect(jsonPath("$.description", is("Updated Txn Description")))
               .andExpect(jsonPath("$.amount", is(150)));
    }

    @Test
    void updateTransaction_shouldReturnNotFoundWhenMissing() throws Exception {
        Transaction details = new Transaction();
        given(transactionService.updateTransaction(eq(99L), any(Transaction.class))).willReturn(Optional.empty());

        mockMvc.perform(put("/api/v1/transactions/{id}", 99L)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(details)))
               .andExpect(status().isNotFound())
               .andExpect(content().string("Transaction not found")); // Check the error message from ResponseStatusException
    }

     @Test
    void updateTransaction_shouldReturnBadRequestOnIllegalArgument() throws Exception {
        Transaction details = new Transaction();
        String errorMessage = "Invalid amount";
        given(transactionService.updateTransaction(eq(1L), any(Transaction.class)))
            .willThrow(new IllegalArgumentException(errorMessage));

        mockMvc.perform(put("/api/v1/transactions/{id}", 1L)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(details)))
               .andExpect(status().isBadRequest())
               .andExpect(content().string(errorMessage));
    }

    @Test
    void splitTransaction_shouldReturnUpdatedParent() throws Exception {
        SplitRequest splitRequest = new SplitRequest();
        splitRequest.setAmount1(BigDecimal.valueOf(30.00));
        splitRequest.setAmount2(BigDecimal.valueOf(70.00));

        Transaction updatedParent = new Transaction(); // What service returns
        updatedParent.setId(1L);
        updatedParent.setAmount(splitRequest.getAmount2());
        updatedParent.setDescription(transaction1.getDescription()); // Assuming description stays same
        updatedParent.setUpdatedAt(LocalDateTime.now());

        given(transactionService.splitTransaction(eq(1L), eq(splitRequest.getAmount1()), eq(splitRequest.getAmount2())))
            .willReturn(updatedParent);

        mockMvc.perform(post("/api/v1/transactions/{parentId}/split", 1L)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(splitRequest)))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.id", is(1)))
               .andExpect(jsonPath("$.amount", closeTo(70.00, 0.01)));
    }

    @Test
    void splitTransaction_shouldReturnBadRequestOnNullAmounts() throws Exception {
        SplitRequest splitRequest = new SplitRequest(); // amounts are null

        mockMvc.perform(post("/api/v1/transactions/{parentId}/split", 1L)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(splitRequest)))
               .andExpect(status().isBadRequest())
               .andExpect(content().string("Both amount1 and amount2 must be provided."));
    }

    @Test
    void splitTransaction_shouldReturnBadRequestOnIllegalArgument() throws Exception {
        SplitRequest splitRequest = new SplitRequest();
        splitRequest.setAmount1(BigDecimal.valueOf(30.00));
        splitRequest.setAmount2(BigDecimal.valueOf(60.00)); // Doesn't sum to 100
        String errorMessage = "Split amounts do not match parent amount";

        given(transactionService.splitTransaction(eq(1L), any(BigDecimal.class), any(BigDecimal.class)))
            .willThrow(new IllegalArgumentException(errorMessage));

        mockMvc.perform(post("/api/v1/transactions/{parentId}/split", 1L)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(splitRequest)))
               .andExpect(status().isBadRequest())
               .andExpect(content().string(errorMessage));
    }

    @Test
    void splitTransaction_shouldReturnNotFoundOnResponseStatusException() throws Exception {
         SplitRequest splitRequest = new SplitRequest();
        splitRequest.setAmount1(BigDecimal.valueOf(30.00));
        splitRequest.setAmount2(BigDecimal.valueOf(70.00));
        String errorMessage = "Parent transaction not found";

        given(transactionService.splitTransaction(eq(99L), any(BigDecimal.class), any(BigDecimal.class)))
            .willThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, errorMessage));

        mockMvc.perform(post("/api/v1/transactions/{parentId}/split", 99L)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(splitRequest)))
               .andExpect(status().isNotFound())
               .andExpect(content().string(errorMessage));
    }

    @Test
    void deleteTransaction_shouldReturnNoContentWhenSuccessful() throws Exception {
        given(transactionService.deleteTransaction(1L)).willReturn(true);

        mockMvc.perform(delete("/api/v1/transactions/{id}", 1L))
               .andExpect(status().isNoContent());
    }

    @Test
    void deleteTransaction_shouldReturnNotFoundWhenMissing() throws Exception {
        given(transactionService.deleteTransaction(99L)).willReturn(false);

        mockMvc.perform(delete("/api/v1/transactions/{id}", 99L))
               .andExpect(status().isNotFound());
    }
} 