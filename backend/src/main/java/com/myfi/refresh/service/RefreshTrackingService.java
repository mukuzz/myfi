package com.myfi.refresh.service;

import java.util.Map;
import java.util.Optional;

import com.myfi.refresh.dto.AggregatedRefreshStatusResponse;
import com.myfi.refresh.dto.RefreshOperationProgress;
import com.myfi.refresh.enums.RefreshJobStatus;
import com.myfi.refresh.enums.RefreshType;

public interface RefreshTrackingService {

    void initializeOperation(RefreshType type, String operationId, String operationName, Optional<Integer> totalItems);

    void updateOperationState(RefreshType type, String operationId, RefreshJobStatus status, String message);

    void updateOperationProgress(RefreshType type, String operationId, RefreshJobStatus status, String message, int itemsProcessed, Optional<Integer> totalItems);

    void completeOperationSuccessfully(RefreshType type, String operationId, String message);

    void failOperation(RefreshType type, String operationId, String errorMessage);

    AggregatedRefreshStatusResponse getOverallRefreshStatus();
    
    Map<String, RefreshOperationProgress> getProgressForType(RefreshType type);

    Optional<RefreshOperationProgress> getProgressForOperation(RefreshType type, String operationId);

    void clearProgressForType(RefreshType type);

    void clearAllProgress();
} 