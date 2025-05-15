package com.myfi.refresh.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.myfi.refresh.enums.RefreshJobStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL) // Important for fields like errorMessage
public class OperationStatusDetail {
    private String accountNumber; // Mapped from RefreshOperationProgress.operationId
    private String accountName;   // Mapped from RefreshOperationProgress.operationName
    private RefreshJobStatus status; // Or String if enum name is strictly needed, but enum is better for client typing
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS")
    private LocalDateTime startTime;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS")
    private LocalDateTime lastUpdateTime;
    
    private String errorMessage;
    private List<ProgressHistoryEntry> history;

    // Optional: include processing counts if useful for the new global status view
    private Integer itemsProcessed;
    private Integer itemsTotal;
} 