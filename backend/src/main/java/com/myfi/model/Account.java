package com.myfi.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "accounts")
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Account {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountType type;

    // Balance will be derived from the latest AccountHistory
    @Transient
    private BigDecimal balance;

    @Column(name = "currency", nullable = false)
    private String currency;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "account_number", nullable = false)
    private String accountNumber;

    @Column(name = "cc_statement_generation_day")
    private Integer ccStatementGenerationDay;
    
    @Column(name = "parent_account_id")
    private Long parentAccountId;

    @OneToMany(mappedBy = "parentAccountId", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Account> childAccounts;

    // Added relationship
    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Transaction> transactions;

    // Added relationship to AccountHistory
    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore // Avoid infinite recursion during serialization
    private List<AccountHistory> accountHistories;

    // Method to get the latest balance (logic will be in service)
    public BigDecimal getLatestBalance() {
        // Placeholder: Actual logic will fetch from the latest AccountHistory
        // For now, return the transient balance field if set, or zero
        return this.balance != null ? this.balance : BigDecimal.ZERO;
    }

    public enum AccountType {
        SAVINGS("Savings"),
        CREDIT_CARD("Credit Card"),
        LOAN("Loan"),
        STOCKS("Stocks"),
        FIXED_DEPOSIT("Fixed Deposit"),
        MUTUAL_FUND("Mutual Fund"),
        CRYPTO("Crypto");

        private final String displayName;

        AccountType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
} 