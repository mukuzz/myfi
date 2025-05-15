package com.myfi.credentials.controller;

import com.myfi.credentials.service.CredentialsService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/credentials")
@Validated
public class CredentialsController {

    @Autowired
    private CredentialsService credentialsService;

    // DTO for saving/updating credentials
    public static class CredentialsRequest {
        @NotBlank(message = "Account number cannot be blank")
        public String accountNumber;
        @NotBlank(message = "Account name cannot be blank")
        public String accountName;
        @NotBlank(message = "Username cannot be blank")
        public String username;
        @NotBlank(message = "Password cannot be blank")
        public String password;
    }

    @PostMapping
    public ResponseEntity<Void> saveOrUpdateCredentials(
        @RequestHeader("X-Master-Key") @NotBlank String masterKey,
        @RequestBody @Valid CredentialsRequest request
    ) {
        log.info("Received request to save/update credentials for account number: {} and account name: {}", request.accountNumber, request.accountName);
        try {
            credentialsService.saveCredentials(request.accountNumber, request.accountName, request.username, request.password, masterKey);
            log.info("Successfully saved/updated credentials for account number: {} and account name: {}", request.accountNumber, request.accountName);
            // Return 201 CREATED if new, 200 OK if updated - for simplicity, just 200 or 201.
            // The service itself handles create/update logic. Let's assume 201 for new/updated for simplicity.
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (Exception e) {
            log.error("Error saving/updating credentials for account number {}: {}", request.accountNumber, e.getMessage(), e);
            // Consider more specific error responses based on exception type
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
} 