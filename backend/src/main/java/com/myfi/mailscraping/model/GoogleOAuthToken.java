package com.myfi.mailscraping.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
// Rename the table as well for clarity
@Table(name = "google_oauth_token") 
@Data
@NoArgsConstructor
// Rename the class
public class GoogleOAuthToken {

    @Id
    private Long id = 1L;

    @Column(name = "refresh_token", nullable = false, length = 1024)
    private String refreshToken;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // Update constructor name
    public GoogleOAuthToken(String refreshToken) {
        this.id = 1L;
        this.refreshToken = refreshToken;
    }
} 