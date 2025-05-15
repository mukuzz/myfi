package com.myfi.refresh.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AggregatedRefreshStatusResponse {
    private Map<String, OperationStatusDetail> progressMap;
    private boolean refreshInProgress;
} 