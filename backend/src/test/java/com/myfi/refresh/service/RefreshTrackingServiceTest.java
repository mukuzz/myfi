package com.myfi.refresh.service;

import com.myfi.refresh.dto.AggregatedRefreshStatusResponse;
import com.myfi.refresh.dto.RefreshOperationProgress;
import com.myfi.refresh.enums.RefreshJobStatus;
import com.myfi.refresh.enums.RefreshType;
import com.myfi.refresh.service.impl.RefreshTrackingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

class RefreshTrackingServiceTest {

    private RefreshTrackingService refreshTrackingService;

    @BeforeEach
    void setUp() {
        refreshTrackingService = new RefreshTrackingServiceImpl();
    }

    @Nested
    @DisplayName("Operation Initialization Tests")
    class OperationInitializationTests {

        @Test
        @DisplayName("Should initialize operation with default values")
        void shouldInitializeOperationWithDefaults() {
            // Given
            String operationId = "test-operation-1";
            String operationName = "Test Operation";

            // When
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, operationName, Optional.empty());

            // Then
            Optional<RefreshOperationProgress> progress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, operationId);
            assertThat(progress).isPresent();
            assertThat(progress.get().getOperationId()).isEqualTo(operationId);
            assertThat(progress.get().getOperationName()).isEqualTo(operationName);
            assertThat(progress.get().getStatus()).isEqualTo(RefreshJobStatus.PENDING);
            assertThat(progress.get().getItemsProcessed()).isEqualTo(0);
            assertThat(progress.get().getItemsTotal()).isEqualTo(0);
            assertThat(progress.get().getStartTime()).isNotNull();
            assertThat(progress.get().getLastUpdateTime()).isNotNull();
            assertThat(progress.get().getHistory()).isNotEmpty();
        }

        @Test
        @DisplayName("Should initialize operation with total items")
        void shouldInitializeOperationWithTotalItems() {
            // Given
            String operationId = "test-operation-2";
            String operationName = "Test Operation with Total";
            int totalItems = 100;

            // When
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, operationName, Optional.of(totalItems));

            // Then
            Optional<RefreshOperationProgress> progress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, operationId);
            assertThat(progress).isPresent();
            assertThat(progress.get().getItemsTotal()).isEqualTo(totalItems);
        }

        @Test
        @DisplayName("Should allow multiple operations for same type")
        void shouldAllowMultipleOperationsForSameType() {
            // Given
            String operationId1 = "operation-1";
            String operationId2 = "operation-2";

            // When
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId1, "Operation 1", Optional.empty());
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId2, "Operation 2", Optional.empty());

            // Then
            Map<String, RefreshOperationProgress> progressMap = refreshTrackingService.getProgressForType(RefreshType.GMAIL_SYNC);
            assertThat(progressMap).hasSize(2);
            assertThat(progressMap).containsKeys(operationId1, operationId2);
        }
    }

    @Nested
    @DisplayName("Operation State Update Tests")
    class OperationStateUpdateTests {

        @Test
        @DisplayName("Should update operation state successfully")
        void shouldUpdateOperationState() {
            // Given
            String operationId = "test-operation";
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Test", Optional.empty());

            // When
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_STARTED, "Processing started");

            // Then
            Optional<RefreshOperationProgress> progress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, operationId);
            assertThat(progress).isPresent();
            assertThat(progress.get().getStatus()).isEqualTo(RefreshJobStatus.PROCESSING_STARTED);
            assertThat(progress.get().getStatusMessage()).isEqualTo("Processing started");
            assertThat(progress.get().getHistory()).hasSize(2); // Initial + update
        }

        @Test
        @DisplayName("Should handle update for non-existent operation gracefully")
        void shouldHandleUpdateForNonExistentOperation() {
            // When/Then - Should not throw exception
            assertThatCode(() -> 
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, "non-existent", RefreshJobStatus.COMPLETED, "Done")
            ).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should update last update time on state change")
        void shouldUpdateLastUpdateTimeOnStateChange() throws InterruptedException {
            // Given
            String operationId = "test-operation";
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Test", Optional.empty());
            
            Optional<RefreshOperationProgress> initialProgress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, operationId);
            assertThat(initialProgress).isPresent();
            
            Thread.sleep(10); // Small delay to ensure different timestamp

            // When
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_STARTED, "Processing");

            // Then
            Optional<RefreshOperationProgress> updatedProgress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, operationId);
            assertThat(updatedProgress).isPresent();
            assertThat(updatedProgress.get().getLastUpdateTime()).isAfter(initialProgress.get().getLastUpdateTime());
        }
    }

    @Nested
    @DisplayName("Operation Progress Update Tests")
    class OperationProgressUpdateTests {

        @Test
        @DisplayName("Should update operation progress with processed count")
        void shouldUpdateOperationProgress() {
            // Given
            String operationId = "test-operation";
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Test", Optional.of(100));

            // When
            refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processing 50 items", 50, Optional.empty());

            // Then
            Optional<RefreshOperationProgress> progress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, operationId);
            assertThat(progress).isPresent();
            assertThat(progress.get().getStatus()).isEqualTo(RefreshJobStatus.PROCESSING_IN_PROGRESS);
            assertThat(progress.get().getItemsProcessed()).isEqualTo(50);
            assertThat(progress.get().getItemsTotal()).isEqualTo(100);
            assertThat(progress.get().getStatusMessage()).isEqualTo("Processing 50 items");
        }

        @Test
        @DisplayName("Should update total items during progress update")
        void shouldUpdateTotalItemsDuringProgressUpdate() {
            // Given
            String operationId = "test-operation";
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Test", Optional.empty());

            // When
            refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processing", 25, Optional.of(200));

            // Then
            Optional<RefreshOperationProgress> progress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, operationId);
            assertThat(progress).isPresent();
            assertThat(progress.get().getItemsProcessed()).isEqualTo(25);
            assertThat(progress.get().getItemsTotal()).isEqualTo(200);
        }

        @Test
        @DisplayName("Should handle progress update for non-existent operation")
        void shouldHandleProgressUpdateForNonExistentOperation() {
            // When/Then - Should not throw exception
            assertThatCode(() -> 
                refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, "non-existent", RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processing", 10, Optional.of(100))
            ).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Operation Completion Tests")
    class OperationCompletionTests {

        @Test
        @DisplayName("Should complete operation successfully")
        void shouldCompleteOperationSuccessfully() {
            // Given
            String operationId = "test-operation";
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Test", Optional.empty());

            // When
            refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, operationId, "Operation completed successfully");

            // Then
            Optional<RefreshOperationProgress> progress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, operationId);
            assertThat(progress).isPresent();
            assertThat(progress.get().getStatus()).isEqualTo(RefreshJobStatus.COMPLETED);
            assertThat(progress.get().getStatusMessage()).isEqualTo("Operation completed successfully");
            assertThat(progress.get().isTerminalState()).isTrue();
        }

        @Test
        @DisplayName("Should fail operation with error message")
        void shouldFailOperationWithErrorMessage() {
            // Given
            String operationId = "test-operation";
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Test", Optional.empty());

            // When
            refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, operationId, "Authentication failed");

            // Then
            Optional<RefreshOperationProgress> progress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, operationId);
            assertThat(progress).isPresent();
            assertThat(progress.get().getStatus()).isEqualTo(RefreshJobStatus.ERROR);
            assertThat(progress.get().getErrorMessage()).isEqualTo("Authentication failed");
            assertThat(progress.get().isTerminalState()).isTrue();
        }

        @Test
        @DisplayName("Should handle completion for non-existent operation")
        void shouldHandleCompletionForNonExistentOperation() {
            // When/Then - Should not throw exception
            assertThatCode(() -> 
                refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, "non-existent", "Done")
            ).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Terminal State Tests")
    class TerminalStateTests {

        @Test
        @DisplayName("Should identify terminal states correctly")
        void shouldIdentifyTerminalStatesCorrectly() {
            // Test each terminal state
            String baseOperationId = "terminal-test-";
            
            // COMPLETED
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, baseOperationId + "1", "Test 1", Optional.empty());
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, baseOperationId + "1", RefreshJobStatus.COMPLETED, "Done");
            
            // ERROR
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, baseOperationId + "2", "Test 2", Optional.empty());
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, baseOperationId + "2", RefreshJobStatus.ERROR, "Error");
            
            // LOGIN_FAILED
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, baseOperationId + "3", "Test 3", Optional.empty());
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, baseOperationId + "3", RefreshJobStatus.LOGIN_FAILED, "Login failed");
            
            // PROCESSING_FAILED
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, baseOperationId + "4", "Test 4", Optional.empty());
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, baseOperationId + "4", RefreshJobStatus.PROCESSING_FAILED, "Processing failed");
            
            // LOGOUT_FAILED
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, baseOperationId + "5", "Test 5", Optional.empty());
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, baseOperationId + "5", RefreshJobStatus.LOGOUT_FAILED, "Logout failed");
            
            // Non-terminal state
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, baseOperationId + "6", "Test 6", Optional.empty());
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, baseOperationId + "6", RefreshJobStatus.PROCESSING_IN_PROGRESS, "In progress");

            // Verify terminal states
            for (int i = 1; i <= 5; i++) {
                Optional<RefreshOperationProgress> progress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, baseOperationId + i);
                assertThat(progress).isPresent();
                assertThat(progress.get().isTerminalState()).isTrue();
            }
            
            // Verify non-terminal state
            Optional<RefreshOperationProgress> nonTerminalProgress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, baseOperationId + "6");
            assertThat(nonTerminalProgress).isPresent();
            assertThat(nonTerminalProgress.get().isTerminalState()).isFalse();
        }
    }

    @Nested
    @DisplayName("Overall Status Tests")
    class OverallStatusTests {

        @Test
        @DisplayName("Should return empty status when no operations exist")
        void shouldReturnEmptyStatusWhenNoOperations() {
            // When
            AggregatedRefreshStatusResponse status = refreshTrackingService.getOverallRefreshStatus();

            // Then
            assertThat(status.getProgressMap()).isEmpty();
            assertThat(status.isRefreshInProgress()).isFalse();
        }

        @Test
        @DisplayName("Should indicate refresh in progress when operation is active")
        void shouldIndicateRefreshInProgressWhenOperationIsActive() {
            // Given
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, "active-operation", "Active Operation", Optional.empty());
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, "active-operation", RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processing");

            // When
            AggregatedRefreshStatusResponse status = refreshTrackingService.getOverallRefreshStatus();

            // Then
            assertThat(status.isRefreshInProgress()).isTrue();
            assertThat(status.getProgressMap()).hasSize(1);
            assertThat(status.getProgressMap()).containsKey("active-operation");
        }

        @Test
        @DisplayName("Should indicate refresh not in progress when all operations are terminal")
        void shouldIndicateRefreshNotInProgressWhenAllOperationsAreTerminal() {
            // Given
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, "completed-operation", "Completed Operation", Optional.empty());
            refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, "completed-operation", "Done");

            // When
            AggregatedRefreshStatusResponse status = refreshTrackingService.getOverallRefreshStatus();

            // Then
            assertThat(status.isRefreshInProgress()).isFalse();
            assertThat(status.getProgressMap()).hasSize(1);
        }

        @Test
        @DisplayName("Should indicate refresh in progress when at least one operation is active")
        void shouldIndicateRefreshInProgressWhenAtLeastOneOperationIsActive() {
            // Given
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, "completed-operation", "Completed", Optional.empty());
            refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, "completed-operation", "Done");
            
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, "active-operation", "Active", Optional.empty());
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, "active-operation", RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processing");

            // When
            AggregatedRefreshStatusResponse status = refreshTrackingService.getOverallRefreshStatus();

            // Then
            assertThat(status.isRefreshInProgress()).isTrue();
            assertThat(status.getProgressMap()).hasSize(2);
        }
    }

    @Nested
    @DisplayName("Progress Retrieval Tests")
    class ProgressRetrievalTests {

        @Test
        @DisplayName("Should return empty map for non-existent refresh type")
        void shouldReturnEmptyMapForNonExistentRefreshType() {
            // When
            Map<String, RefreshOperationProgress> progress = refreshTrackingService.getProgressForType(RefreshType.GMAIL_SYNC);

            // Then
            assertThat(progress).isEmpty();
        }

        @Test
        @DisplayName("Should return unmodifiable map for progress")
        void shouldReturnUnmodifiableMapForProgress() {
            // Given
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, "test-operation", "Test", Optional.empty());

            // When
            Map<String, RefreshOperationProgress> progress = refreshTrackingService.getProgressForType(RefreshType.GMAIL_SYNC);

            // Then
            assertThat(progress).hasSize(1);
            assertThatThrownBy(() -> progress.put("new-key", null))
                .isInstanceOf(UnsupportedOperationException.class);
        }

        @Test
        @DisplayName("Should return empty optional for non-existent operation")
        void shouldReturnEmptyOptionalForNonExistentOperation() {
            // When
            Optional<RefreshOperationProgress> progress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, "non-existent");

            // Then
            assertThat(progress).isEmpty();
        }
    }

    @Nested
    @DisplayName("Clear Progress Tests")
    class ClearProgressTests {

        @Test
        @DisplayName("Should clear progress for specific type")
        void shouldClearProgressForSpecificType() {
            // Given
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, "operation-1", "Test 1", Optional.empty());

            // When
            refreshTrackingService.clearProgressForType(RefreshType.GMAIL_SYNC);

            // Then
            Map<String, RefreshOperationProgress> progress = refreshTrackingService.getProgressForType(RefreshType.GMAIL_SYNC);
            assertThat(progress).isEmpty();
        }

        @Test
        @DisplayName("Should clear all progress")
        void shouldClearAllProgress() {
            // Given
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, "operation-1", "Test 1", Optional.empty());

            // When
            refreshTrackingService.clearAllProgress();

            // Then
            AggregatedRefreshStatusResponse status = refreshTrackingService.getOverallRefreshStatus();
            assertThat(status.getProgressMap()).isEmpty();
            assertThat(status.isRefreshInProgress()).isFalse();
        }

        @Test
        @DisplayName("Should handle clearing non-existent type gracefully")
        void shouldHandleClearingNonExistentTypeGracefully() {
            // When/Then - Should not throw exception
            assertThatCode(() -> 
                refreshTrackingService.clearProgressForType(RefreshType.GMAIL_SYNC)
            ).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Error Message Tests")
    class ErrorMessageTests {

        @Test
        @DisplayName("Should return error message for error states")
        void shouldReturnErrorMessageForErrorStates() {
            // Test error states that should return error message
            RefreshJobStatus[] errorStates = {
                RefreshJobStatus.ERROR,
                RefreshJobStatus.LOGIN_FAILED,
                RefreshJobStatus.PROCESSING_FAILED,
                RefreshJobStatus.LOGOUT_FAILED
            };

            for (int i = 0; i < errorStates.length; i++) {
                String operationId = "error-test-" + i;
                String errorMessage = "Error for " + errorStates[i];
                
                refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Test", Optional.empty());
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, errorStates[i], errorMessage);
                
                Optional<RefreshOperationProgress> progress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, operationId);
                assertThat(progress).isPresent();
                assertThat(progress.get().getErrorMessage()).isEqualTo(errorMessage);
            }
        }

        @Test
        @DisplayName("Should return null error message for non-error states")
        void shouldReturnNullErrorMessageForNonErrorStates() {
            // Given
            String operationId = "success-test";
            refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Test", Optional.empty());
            refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.COMPLETED, "Success");

            // When
            Optional<RefreshOperationProgress> progress = refreshTrackingService.getProgressForOperation(RefreshType.GMAIL_SYNC, operationId);

            // Then
            assertThat(progress).isPresent();
            assertThat(progress.get().getErrorMessage()).isNull();
        }
    }
}