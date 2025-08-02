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

    // DTO for saving/updating generic key-value credentials
    public static class GenericCredentialRequest {
        @NotBlank(message = "Key cannot be blank")
        public String key;
        @NotBlank(message = "Value cannot be blank")
        public String value;
    }

    @PostMapping("/key-value")
    public ResponseEntity<Void> saveOrUpdateGenericCredential(
        @RequestBody @Valid GenericCredentialRequest request
    ) {
        log.info("Received request to save/update generic credential for key: {}", request.key);
        try {
            credentialsService.saveCredential(request.key, request.value);
            log.info("Successfully saved/updated generic credential for key: {}", request.key);
            return ResponseEntity.status(HttpStatus.CREATED).build(); // 201 for new/updated
        } catch (Exception e) {
            log.error("Error saving/updating generic credential for key {}: {}", request.key, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
} 