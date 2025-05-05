package com.myfi.mailscraping.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "processed_gmail_messages", indexes = {
    @Index(name = "idx_processed_gmail_message_id", columnList = "messageId", unique = true)
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

    @Column(nullable = false)
    private LocalDateTime processedAt;

    @Column(nullable = false)
    private LocalDateTime messageDateTime;

    @PrePersist
    protected void onCreate() {
        processedAt = LocalDateTime.now();
    }

} 