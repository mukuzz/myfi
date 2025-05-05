package com.myfi.bankscraping.model;

import com.myfi.model.Transaction;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ScrapingResult {
    private List<Transaction> transactions;
    private String status;
    private String errorMessage;
    private LocalDateTime lastSyncTime;
} 