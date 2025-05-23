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
@Table(name = "account_credentials", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"accountNumber"})
})
@Data
@NoArgsConstructor
public class AccountCredentialEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String accountNumber;

    @Column(nullable = false)
    private String accountName;

    @Column(nullable = false, length = 1024) // Assuming username might also be long once encrypted
    private String encryptedUsername;

    @Column(nullable = false, length = 1024) // Increased length for encrypted data + IV + Base64 encoding
    private String encryptedPassword;

    @Column(nullable = false)
    private String salt;

    public AccountCredentialEntity(String accountNumber, String accountName, String encryptedUsername, String encryptedPassword, String salt) {
        this.accountNumber = accountNumber;
        this.accountName = accountName;
        this.encryptedUsername = encryptedUsername;
        this.encryptedPassword = encryptedPassword;
        this.salt = salt;
    }
} 