package com.myfi.refreshTracker.dto;

import com.myfi.refreshTracker.enums.RefreshJobStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProgressHistoryEntry {
    private RefreshJobStatus status;
    private LocalDateTime timestamp;
    private String message;
} 