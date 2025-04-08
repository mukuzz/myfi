package com.myfi.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Represents the system status, primarily tracking the last successful scrape time.
 * Uses a fixed ID (1L) to ensure only a single row exists for this global status.
 */
@Entity
@Table(name = "system_status")
@Data
@NoArgsConstructor // Needed for JPA
public class SystemStatus {

    // Use a fixed ID (e.g., 1L) to ensure only one row exists
    @Id
    private Long id = 1L;

    @Column(name = "last_scrape_time")
    private LocalDateTime lastScrapeTime;

    /**
     * Constructor to initialize with a specific time.
     * Ensures the fixed ID is set.
     * @param lastScrapeTime The initial last scrape time.
     */
    public SystemStatus(LocalDateTime lastScrapeTime) {
        this.id = 1L; // Ensure the fixed ID is set
        this.lastScrapeTime = lastScrapeTime;
    }
}