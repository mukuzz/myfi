package com.myfi.refresh.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfi.mailscraping.service.GmailService;
import com.myfi.refresh.dto.AggregatedRefreshStatusResponse;
import com.myfi.refresh.enums.RefreshJobStatus;
import com.myfi.refresh.enums.RefreshType;
import com.myfi.refresh.service.RefreshTrackingService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class RefreshFlowEndToEndTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RefreshTrackingService refreshTrackingService;

    @MockBean
    private GmailService gmailService;

    @Autowired
    private ObjectMapper objectMapper;

    @Nested
    @DisplayName("Complete Refresh Flow Tests")
    class CompleteRefreshFlowTests {

        @Test
        @DisplayName("Should complete full refresh flow from trigger to completion")
        void shouldCompleteFullRefreshFlowFromTriggerToCompletion() throws Exception {
            // Given - Mock Gmail service to simulate email processing
            String operationId = "GMAIL_SYNC_" + System.currentTimeMillis();
            
            doAnswer(invocation -> {
                // Simulate the refresh tracking calls that GmailService would make
                refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Email Processing", Optional.of(3));
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.LOGIN_STARTED, "Authenticating");
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.LOGIN_SUCCESS, "Authentication successful");
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_STARTED, "Fetching emails");
                refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processing emails", 0, Optional.of(3));
                
                // Simulate processing 3 emails
                for (int i = 1; i <= 3; i++) {
                    refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId, 
                        RefreshJobStatus.PROCESSING_IN_PROGRESS, 
                        "Processed email " + i + "/3", i, Optional.of(3));
                }
                
                refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, operationId, "Gmail sync completed successfully");
                return null;
            }).when(gmailService).syncAndProcessEmails();

            // When - Trigger full refresh
            MvcResult triggerResult = mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.message", containsString("Full refresh triggered")))
                    .andReturn();

            // Give some time for async processing
            Thread.sleep(1000);

            // Then - Check status immediately after trigger (should show in progress)
            MvcResult statusResult = mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.refreshInProgress", is(false))) // Should be completed by now
                    .andReturn();

            String statusJson = statusResult.getResponse().getContentAsString();
            AggregatedRefreshStatusResponse statusResponse = objectMapper.readValue(statusJson, AggregatedRefreshStatusResponse.class);

            // Verify the final state
            assertThat(statusResponse.getProgressMap()).hasSize(1);
            
            // Find the operation (key might vary due to timestamp)
            var progressEntry = statusResponse.getProgressMap().values().iterator().next();
            assertThat(progressEntry.getAccountName()).isEqualTo("Email Processing");
            assertThat(progressEntry.getStatus()).isEqualTo(RefreshJobStatus.COMPLETED);
            assertThat(progressEntry.getItemsProcessed()).isEqualTo(3);
            assertThat(progressEntry.getItemsTotal()).isEqualTo(3);
            assertThat(progressEntry.getErrorMessage()).isNull();

            // Verify Gmail service was called
            verify(gmailService, times(1)).syncAndProcessEmails();
        }

        @Test
        @DisplayName("Should handle refresh flow with authentication failure")
        void shouldHandleRefreshFlowWithAuthenticationFailure() throws Exception {
            // Given - Mock Gmail service to fail authentication
            String operationId = "GMAIL_SYNC_" + System.currentTimeMillis();
            
            doAnswer(invocation -> {
                refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Email Processing", Optional.empty());
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.LOGIN_STARTED, "Authenticating");
                refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, operationId, "Authentication failed: Invalid credentials");
                return null;
            }).when(gmailService).syncAndProcessEmails();

            // When - Trigger full refresh
            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isAccepted());

            // Give some time for async processing
            Thread.sleep(1000);

            // Then - Check status shows failure
            MvcResult statusResult = mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.refreshInProgress", is(false)))
                    .andReturn();

            String statusJson = statusResult.getResponse().getContentAsString();
            AggregatedRefreshStatusResponse statusResponse = objectMapper.readValue(statusJson, AggregatedRefreshStatusResponse.class);

            // Verify the error state
            assertThat(statusResponse.getProgressMap()).hasSize(1);
            
            var progressEntry = statusResponse.getProgressMap().values().iterator().next();
            assertThat(progressEntry.getStatus()).isEqualTo(RefreshJobStatus.ERROR);
            assertThat(progressEntry.getErrorMessage()).isEqualTo("Authentication failed: Invalid credentials");
        }

        @Test
        @DisplayName("Should handle refresh flow with partial failures")
        void shouldHandleRefreshFlowWithPartialFailures() throws Exception {
            // Given - Mock Gmail service with partial processing
            String operationId = "GMAIL_SYNC_" + System.currentTimeMillis();
            
            doAnswer(invocation -> {
                refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Email Processing", Optional.of(5));
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.LOGIN_STARTED, "Authenticating");
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.LOGIN_SUCCESS, "Authentication successful");
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_STARTED, "Fetching emails");
                
                // Process some emails successfully, then fail
                refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processing emails", 0, Optional.of(5));
                refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processed email 1/5", 1, Optional.of(5));
                refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processed email 2/5", 2, Optional.of(5));
                
                // Simulate processing failure
                refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, operationId, "Email parsing failed for message 3");
                return null;
            }).when(gmailService).syncAndProcessEmails();

            // When - Trigger full refresh
            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isAccepted());

            Thread.sleep(1000);

            // Then - Check status shows partial completion with error
            MvcResult statusResult = mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.refreshInProgress", is(false)))
                    .andReturn();

            String statusJson = statusResult.getResponse().getContentAsString();
            AggregatedRefreshStatusResponse statusResponse = objectMapper.readValue(statusJson, AggregatedRefreshStatusResponse.class);

            var progressEntry = statusResponse.getProgressMap().values().iterator().next();
            assertThat(progressEntry.getStatus()).isEqualTo(RefreshJobStatus.ERROR);
            assertThat(progressEntry.getItemsProcessed()).isEqualTo(2); // Should show partial progress
            assertThat(progressEntry.getItemsTotal()).isEqualTo(5);
            assertThat(progressEntry.getErrorMessage()).isEqualTo("Email parsing failed for message 3");
        }
    }

    @Nested
    @DisplayName("Concurrent Refresh Tests")
    class ConcurrentRefreshTests {

        @Test
        @DisplayName("Should handle multiple concurrent refresh requests")
        void shouldHandleMultipleConcurrentRefreshRequests() throws Exception {
            // Given - Mock Gmail service with longer processing time
            doAnswer(invocation -> {
                String operationId = "GMAIL_SYNC_" + System.currentTimeMillis();
                refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Email Processing", Optional.of(10));
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.LOGIN_STARTED, "Authenticating");
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.LOGIN_SUCCESS, "Authentication successful");
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_STARTED, "Processing");
                
                // Simulate longer processing
                for (int i = 1; i <= 10; i++) {
                    refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId, 
                        RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processed " + i + "/10", i, Optional.of(10));
                    try {
                        Thread.sleep(50); // Small delay to simulate processing time
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                }
                
                refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, operationId, "Completed");
                return null;
            }).when(gmailService).syncAndProcessEmails();

            // When - Trigger multiple concurrent requests
            CompletableFuture<MvcResult> request1 = CompletableFuture.supplyAsync(() -> {
                try {
                    return mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                            .andExpect(status().isAccepted())
                            .andReturn();
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });

            CompletableFuture<MvcResult> request2 = CompletableFuture.supplyAsync(() -> {
                try {
                    Thread.sleep(100); // Small delay
                    return mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                            .andExpect(status().isAccepted())
                            .andReturn();
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });

            // Then - Both requests should succeed
            CompletableFuture.allOf(request1, request2).get(10, TimeUnit.SECONDS);

            // Wait for processing to complete
            Thread.sleep(2000);

            // Verify that Gmail service was called multiple times (once for each request)
            verify(gmailService, atLeast(2)).syncAndProcessEmails();

            // Check final status
            mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.refreshInProgress", is(false)));
        }
    }

    @Nested
    @DisplayName("Status Polling Simulation Tests")
    class StatusPollingSimulationTests {

        @Test
        @DisplayName("Should provide consistent status during processing")
        void shouldProvideConsistentStatusDuringProcessing() throws Exception {
            // Given - Mock Gmail service with step-by-step processing
            String operationId = "GMAIL_SYNC_" + System.currentTimeMillis();
            
            doAnswer(invocation -> {
                refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, operationId, "Email Processing", Optional.of(5));
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.LOGIN_STARTED, "Authenticating");
                
                // Process in steps with delays to allow status checking
                CompletableFuture.runAsync(() -> {
                    try {
                        Thread.sleep(200);
                        refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.LOGIN_SUCCESS, "Authenticated");
                        
                        Thread.sleep(200);
                        refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, operationId, RefreshJobStatus.PROCESSING_STARTED, "Processing");
                        
                        for (int i = 1; i <= 5; i++) {
                            Thread.sleep(300);
                            refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, operationId, 
                                RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processed " + i + "/5", i, Optional.of(5));
                        }
                        
                        Thread.sleep(200);
                        refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, operationId, "Completed");
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                });
                
                return null;
            }).when(gmailService).syncAndProcessEmails();

            // When - Trigger refresh
            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isAccepted());

            // Then - Poll status at different intervals to simulate frontend behavior
            
            // Check initial status (should show login started)
            Thread.sleep(300);
            mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.refreshInProgress", is(true)));

            // Check during processing
            Thread.sleep(800);
            MvcResult midProcessResult = mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.refreshInProgress", is(true)))
                    .andReturn();

            String midProcessJson = midProcessResult.getResponse().getContentAsString();
            AggregatedRefreshStatusResponse midProcessStatus = objectMapper.readValue(midProcessJson, AggregatedRefreshStatusResponse.class);
            
            var midProcessEntry = midProcessStatus.getProgressMap().values().iterator().next();
            assertThat(midProcessEntry.getStatus()).isIn(
                RefreshJobStatus.PROCESSING_STARTED, 
                RefreshJobStatus.PROCESSING_IN_PROGRESS
            );

            // Check final status (should be completed)
            Thread.sleep(2000);
            MvcResult finalResult = mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.refreshInProgress", is(false)))
                    .andReturn();

            String finalJson = finalResult.getResponse().getContentAsString();
            AggregatedRefreshStatusResponse finalStatus = objectMapper.readValue(finalJson, AggregatedRefreshStatusResponse.class);
            
            var finalEntry = finalStatus.getProgressMap().values().iterator().next();
            assertThat(finalEntry.getStatus()).isEqualTo(RefreshJobStatus.COMPLETED);
            assertThat(finalEntry.getItemsProcessed()).isEqualTo(5);
            assertThat(finalEntry.getItemsTotal()).isEqualTo(5);
        }
    }

    @Nested
    @DisplayName("Error Recovery Tests")
    class ErrorRecoveryTests {

        @Test
        @DisplayName("Should allow new refresh after previous failure")
        void shouldAllowNewRefreshAfterPreviousFailure() throws Exception {
            // Given - First refresh fails
            String firstOperationId = "GMAIL_SYNC_FAIL_" + System.currentTimeMillis();
            
            doAnswer(invocation -> {
                refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, firstOperationId, "Email Processing", Optional.empty());
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, firstOperationId, RefreshJobStatus.LOGIN_STARTED, "Authenticating");
                refreshTrackingService.failOperation(RefreshType.GMAIL_SYNC, firstOperationId, "Network error");
                return null;
            }).when(gmailService).syncAndProcessEmails();

            // When - First refresh
            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isAccepted());

            Thread.sleep(500);

            // Verify first refresh failed
            mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.refreshInProgress", is(false)));

            // Given - Second refresh succeeds
            String secondOperationId = "GMAIL_SYNC_SUCCESS_" + System.currentTimeMillis();
            
            doAnswer(invocation -> {
                refreshTrackingService.initializeOperation(RefreshType.GMAIL_SYNC, secondOperationId, "Email Processing", Optional.of(2));
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, secondOperationId, RefreshJobStatus.LOGIN_STARTED, "Authenticating");
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, secondOperationId, RefreshJobStatus.LOGIN_SUCCESS, "Authenticated");
                refreshTrackingService.updateOperationState(RefreshType.GMAIL_SYNC, secondOperationId, RefreshJobStatus.PROCESSING_STARTED, "Processing");
                refreshTrackingService.updateOperationProgress(RefreshType.GMAIL_SYNC, secondOperationId, RefreshJobStatus.PROCESSING_IN_PROGRESS, "Processing", 2, Optional.of(2));
                refreshTrackingService.completeOperationSuccessfully(RefreshType.GMAIL_SYNC, secondOperationId, "Success");
                return null;
            }).when(gmailService).syncAndProcessEmails();

            // When - Second refresh
            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isAccepted());

            Thread.sleep(500);

            // Then - Second refresh should succeed
            MvcResult result = mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.refreshInProgress", is(false)))
                    .andReturn();

            String statusJson = result.getResponse().getContentAsString();
            AggregatedRefreshStatusResponse statusResponse = objectMapper.readValue(statusJson, AggregatedRefreshStatusResponse.class);

            // Should have operations from both attempts
            assertThat(statusResponse.getProgressMap()).hasSizeGreaterThanOrEqualTo(1);
            
            // Verify Gmail service was called twice
            verify(gmailService, times(2)).syncAndProcessEmails();
        }
    }

    @Nested
    @DisplayName("API Error Handling Tests")
    class ApiErrorHandlingTests {

        @Test
        @DisplayName("Should handle malformed requests gracefully")
        void shouldHandleMalformedRequestsGracefully() throws Exception {
            // When/Then - Test various malformed requests
            
            // Invalid HTTP method for trigger
            mockMvc.perform(get("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isMethodNotAllowed());

            // Invalid HTTP method for status
            mockMvc.perform(post("/api/v1/refresh/status"))
                    .andExpect(status().isMethodNotAllowed());

            // Non-existent endpoint
            mockMvc.perform(post("/api/v1/refresh/invalid-endpoint"))
                    .andExpect(status().isNotFound());

            // Valid endpoints should still work
            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isAccepted());

            mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should return consistent JSON format")
        void shouldReturnConsistentJsonFormat() throws Exception {
            // When/Then - Verify JSON structure consistency
            
            // Trigger endpoint
            MvcResult triggerResult = mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isAccepted())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.message").exists())
                    .andReturn();

            // Status endpoint
            MvcResult statusResult = mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.refreshInProgress").exists())
                    .andExpect(jsonPath("$.progressMap").exists())
                    .andReturn();

            // Verify JSON can be parsed
            String triggerJson = triggerResult.getResponse().getContentAsString();
            String statusJson = statusResult.getResponse().getContentAsString();
            
            assertThatCode(() -> objectMapper.readTree(triggerJson)).doesNotThrowAnyException();
            assertThatCode(() -> objectMapper.readValue(statusJson, AggregatedRefreshStatusResponse.class)).doesNotThrowAnyException();
        }
    }
}