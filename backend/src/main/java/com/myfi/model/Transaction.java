package com.myfi.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.util.DigestUtils;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "transactions",
       uniqueConstraints = { @UniqueConstraint(columnNames = {"uniqueKey"}) }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Transaction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false)
    private BigDecimal amount;

    @NotNull
    @Column(nullable = false)
    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;

    @Column(name = "transaction_date", nullable = false)
    private LocalDateTime transactionDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "counter_party")
    private String counterParty;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account", nullable = false)
    private Account account;

    @Column(name = "tag_id")
    private Long tagId;

    @Column(name = "notes")
    private String notes;

    @Column(name = "exclude_from_accounting", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean excludeFromAccounting;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @JsonIgnore
    private Transaction parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Transaction> subTransactions;

    @Column(nullable = false, length = 64)
    private String uniqueKey;

    public enum TransactionType {
        CREDIT,
        DEBIT
    }

    public void generateUniqueKey() {
        if (amount == null || description == null || type == null || transactionDate == null || account == null || account.getId() == null) {
            throw new IllegalStateException("Cannot generate unique key: one or more required fields are null.");
        }
        String formattedDate = transactionDate.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        String formattedAmount = amount.stripTrailingZeros().toPlainString();
        
        String keyData = String.join("|", 
            formattedAmount,
            description, 
            type.name(), 
            formattedDate,
            account.getId().toString()
        );
        this.uniqueKey = DigestUtils.md5DigestAsHex(keyData.getBytes());
    }
} 