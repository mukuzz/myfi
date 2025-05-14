package com.myfi.refreshTracker.service.impl;

import com.myfi.refreshTracker.dto.AggregatedRefreshStatusResponse;
import com.myfi.refreshTracker.dto.OperationStatusDetail;
import com.myfi.refreshTracker.dto.RefreshOperationProgress;
import com.myfi.refreshTracker.enums.RefreshJobStatus;
import com.myfi.refreshTracker.enums.RefreshType;
import com.myfi.refreshTracker.service.RefreshTrackingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class RefreshTrackingServiceImpl implements RefreshTrackingService {

    private final ConcurrentHashMap<RefreshType, ConcurrentHashMap<String, RefreshOperationProgress>> allOperationsProgress = new ConcurrentHashMap<>();

    @Override
    public void initializeOperation(RefreshType type, String operationId, String operationName, Optional<Integer> totalItems) {
        allOperationsProgress.computeIfAbsent(type, k -> new ConcurrentHashMap<>());
        RefreshOperationProgress progress = new RefreshOperationProgress(operationId, operationName);
        totalItems.ifPresent(progress::setItemsTotal);
        allOperationsProgress.get(type).put(operationId, progress);
        log.info("Initialized operation {} for {} ({})", operationId, type, operationName);
    }

    @Override
    public void updateOperationState(RefreshType type, String operationId, RefreshJobStatus status, String message) {
        Optional<RefreshOperationProgress> progressOpt = getProgressForOperation(type, operationId);
        if (progressOpt.isPresent()) {
            progressOpt.get().updateStatus(status, message);
            log.info("Updated state for operation {} ({}) to {}: {}", operationId, type, status, message);
        } else {
            log.warn("Attempted to update state for non-existent operation {} ({})", operationId, type);
        }
    }

    @Override
    public void updateOperationProgress(RefreshType type, String operationId, RefreshJobStatus status, String message, int itemsProcessed, Optional<Integer> totalItems) {
        Optional<RefreshOperationProgress> progressOpt = getProgressForOperation(type, operationId);
        if (progressOpt.isPresent()) {
            RefreshOperationProgress progress = progressOpt.get();
            progress.updateProgress(status, message, itemsProcessed);
            totalItems.ifPresent(progress::setItemsTotal);
            log.info("Updated progress for operation {} ({}): {}/{} items, Status: {}, Message: {}", 
                    operationId, type, itemsProcessed, progress.getItemsTotal(), status, message);
        } else {
            log.warn("Attempted to update progress for non-existent operation {} ({})", operationId, type);
        }
    }

    @Override
    public void completeOperationSuccessfully(RefreshType type, String operationId, String message) {
        updateOperationState(type, operationId, RefreshJobStatus.COMPLETED, message);
        log.info("Operation {} ({}) completed successfully.", operationId, type);
    }

    @Override
    public void failOperation(RefreshType type, String operationId, String errorMessage) {
        Optional<RefreshOperationProgress> progressOpt = getProgressForOperation(type, operationId);
        if (progressOpt.isPresent()) {
            progressOpt.get().markAsError(errorMessage);
            log.error("Operation {} ({}) failed: {}", operationId, type, errorMessage);
        } else {
            log.warn("Attempted to mark non-existent operation {} ({}) as failed.", operationId, type);
        }
    }

    @Override
    public AggregatedRefreshStatusResponse getOverallRefreshStatus() {
        Map<String, OperationStatusDetail> combinedProgressMap = new ConcurrentHashMap<>();
        boolean anyOperationInProgress = false;

        for (RefreshType type : allOperationsProgress.keySet()) {
            Map<String, RefreshOperationProgress> typeProgressMap = getProgressForType(type);
            for (Map.Entry<String, RefreshOperationProgress> entry : typeProgressMap.entrySet()) {
                RefreshOperationProgress prog = entry.getValue();
                OperationStatusDetail detail = OperationStatusDetail.builder()
                        .accountNumber(prog.getOperationId())
                        .accountName(prog.getOperationName())
                        .status(prog.getStatus())
                        .startTime(prog.getStartTime())
                        .lastUpdateTime(prog.getLastUpdateTime())
                        .errorMessage(prog.getErrorMessage())
                        .history(prog.getHistory())
                        .itemsProcessed(prog.getItemsProcessed())
                        .itemsTotal(prog.getItemsTotal())
                        .build();
                combinedProgressMap.put(entry.getKey(), detail); 
                if (!prog.isTerminalState()) {
                    anyOperationInProgress = true;
                }
            }
        }
        return AggregatedRefreshStatusResponse.builder()
                .progressMap(combinedProgressMap)
                .refreshInProgress(anyOperationInProgress)
                .build();
    }

    @Override
    public Map<String, RefreshOperationProgress> getProgressForType(RefreshType type) {
        return Collections.unmodifiableMap(allOperationsProgress.getOrDefault(type, new ConcurrentHashMap<>()));
    }

    @Override
    public Optional<RefreshOperationProgress> getProgressForOperation(RefreshType type, String operationId) {
        return Optional.ofNullable(allOperationsProgress.getOrDefault(type, new ConcurrentHashMap<>()).get(operationId));
    }

    @Override
    public void clearProgressForType(RefreshType type) {
        allOperationsProgress.remove(type);
        log.info("Cleared all progress for type: {}", type);
    }

    @Override
    public void clearAllProgress() {
        allOperationsProgress.clear();
        log.info("Cleared all operation progress.");
    }
} 