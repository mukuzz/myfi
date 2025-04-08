package com.myfi.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents the system status, primarily tracking the last successful scrape time
 * as an epoch millisecond timestamp.
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

    // Store time as epoch milliseconds
    @Column(name = "last_scrape_time")
    private long lastScrapeTime;

    /**
     * Constructor to initialize with a specific time (epoch milliseconds).
     * Ensures the fixed ID is set.
     * @param lastScrapeTime The initial last scrape time in epoch milliseconds.
     */
    public SystemStatus(long lastScrapeTime) {
        this.id = 1L; // Ensure the fixed ID is set
        this.lastScrapeTime = lastScrapeTime;
    }
}