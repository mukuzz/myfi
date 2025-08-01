package com.myfi.mailscraping.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "processed_gmail_messages", indexes = {
    @Index(name = "idx_processed_gmail_message_id", columnList = "messageId", unique = true),
    @Index(name = "idx_processed_gmail_message_datetime", columnList = "messageDateTime")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessedGmailMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String messageId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "processed_gmail_message_accounts", 
                    joinColumns = @JoinColumn(name = "processed_message_id"))
    @Column(name = "account_number")
    @Builder.Default
    private Set<String> processedAccountNumbers = new HashSet<>();

    @Column(nullable = false)
    private LocalDateTime firstProcessedAt;

    @Column(nullable = false)
    private LocalDateTime lastProcessedAt;

    @Column(nullable = false)
    private LocalDateTime messageDateTime;

    @Column(nullable = false)
    @Builder.Default
    private Integer transactionCount = 0;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (firstProcessedAt == null) {
            firstProcessedAt = now;
        }
        lastProcessedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        lastProcessedAt = LocalDateTime.now();
    }

    // Helper methods for managing processed account numbers
    public void addProcessedAccount(String accountNumber) {
        if (processedAccountNumbers == null) {
            processedAccountNumbers = new HashSet<>();
        }
        processedAccountNumbers.add(accountNumber);
    }

    public void addProcessedAccounts(Set<String> accountNumbers) {
        if (processedAccountNumbers == null) {
            processedAccountNumbers = new HashSet<>();
        }
        processedAccountNumbers.addAll(accountNumbers);
    }

    public boolean isProcessedForAccount(String accountNumber) {
        return processedAccountNumbers != null && processedAccountNumbers.contains(accountNumber);
    }

    public int getProcessedAccountsCount() {
        return processedAccountNumbers != null ? processedAccountNumbers.size() : 0;
    }
} 