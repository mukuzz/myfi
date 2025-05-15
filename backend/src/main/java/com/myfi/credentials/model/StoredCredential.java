package com.myfi.credentials.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoredCredential {
    private String accountNumber;
    private String username;
    private String encryptedPassword;
    private String salt;
} 