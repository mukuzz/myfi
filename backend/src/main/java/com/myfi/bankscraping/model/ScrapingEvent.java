package com.myfi.bankscraping.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingEvent {
    private ScrapingStatus status;
    private LocalDateTime timestamp;
    private String message; // Optional message (e.g., error details)

    public ScrapingEvent(ScrapingStatus status, LocalDateTime timestamp) {
        this(status, timestamp, null);
    }
} 