package com.myfi.controller;

import com.myfi.model.AccountHistory;
import com.myfi.service.AccountHistoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/account-histories")
public class AccountHistoryController {

    @Autowired
    private AccountHistoryService accountHistoryService;

    // Create a new account history record
    @PostMapping
    public ResponseEntity<AccountHistory> createAccountHistory(@RequestBody AccountHistory accountHistory) {
        AccountHistory savedHistory = accountHistoryService.saveAccountHistory(accountHistory);
        return new ResponseEntity<>(savedHistory, HttpStatus.CREATED);
    }

    // Get all history records for a specific account
    @GetMapping("/account/{accountId}")
    public ResponseEntity<List<AccountHistory>> getAccountHistoryByAccountId(@PathVariable Long accountId) {
        List<AccountHistory> history = accountHistoryService.getAccountHistoryByAccountId(accountId);
        return ResponseEntity.ok(history);
    }

    // Get the latest history record for a specific account
    @GetMapping("/account/{accountId}/latest")
    public ResponseEntity<AccountHistory> getLatestAccountHistory(@PathVariable Long accountId) {
        return accountHistoryService.getLatestAccountHistory(accountId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Get a specific account history record by its ID
    @GetMapping("/{id}")
    public ResponseEntity<AccountHistory> getAccountHistoryById(@PathVariable Long id) {
        return accountHistoryService.getAccountHistoryById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Note: Updating history might not be typical, but providing endpoint if needed.
    // Consider if this is truly required for your use case.
    @PutMapping("/{id}")
    public ResponseEntity<AccountHistory> updateAccountHistory(@PathVariable Long id, @RequestBody AccountHistory accountHistoryDetails) {
        try {
            AccountHistory updatedHistory = accountHistoryService.updateAccountHistory(id, accountHistoryDetails);
            return ResponseEntity.ok(updatedHistory);
        } catch (RuntimeException e) { // Or a more specific exception
            return ResponseEntity.notFound().build();
        }
    }

    // Delete an account history record by its ID
    // Note: Deleting history might have implications. Consider if this is needed.
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccountHistory(@PathVariable Long id) {
        try {
            accountHistoryService.deleteAccountHistory(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) { // Or a more specific exception like EmptyResultDataAccessException
            return ResponseEntity.notFound().build();
        }
    }
} 