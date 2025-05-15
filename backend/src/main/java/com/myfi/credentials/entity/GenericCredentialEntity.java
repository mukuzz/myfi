package com.myfi.credentials.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "generic_credentials", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"credentialKey"})
})
@Data
@NoArgsConstructor
public class GenericCredentialEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String credentialKey; // The key for the credential, e.g., "OPENAI_API_KEY"

    @Column(nullable = false, length = 1024) // Increased length for encrypted data
    private String encryptedValue;

    @Column(nullable = false)
    private String salt;

    public GenericCredentialEntity(String credentialKey, String encryptedValue, String salt) {
        this.credentialKey = credentialKey;
        this.encryptedValue = encryptedValue;
        this.salt = salt;
    }
} 