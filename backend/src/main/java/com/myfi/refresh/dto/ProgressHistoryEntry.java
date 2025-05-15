package com.myfi.refresh.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

import com.myfi.refresh.enums.RefreshJobStatus;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProgressHistoryEntry {
    private RefreshJobStatus status;
    private LocalDateTime timestamp;
    private String message;
} 