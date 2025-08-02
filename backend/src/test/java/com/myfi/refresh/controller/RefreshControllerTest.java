package com.myfi.refresh.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfi.mailscraping.service.GmailService;
import com.myfi.refresh.dto.AggregatedRefreshStatusResponse;
import com.myfi.refresh.dto.OperationStatusDetail;
import com.myfi.refresh.enums.RefreshJobStatus;
import com.myfi.refresh.service.RefreshTrackingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@WebMvcTest(RefreshController.class)
class RefreshControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RefreshTrackingService refreshTrackingService;

    @MockBean
    private GmailService gmailService;

    @Autowired
    private ObjectMapper objectMapper;

    private AggregatedRefreshStatusResponse mockStatusResponse;
    private OperationStatusDetail mockOperationDetail;

    @BeforeEach
    void setUp() {
        mockOperationDetail = OperationStatusDetail.builder()
                .accountNumber("GMAIL_SYNC_123")
                .accountName("Email Processing")
                .status(RefreshJobStatus.COMPLETED)
                .startTime(LocalDateTime.now().minusMinutes(5))
                .lastUpdateTime(LocalDateTime.now())
                .errorMessage(null)
                .history(List.of())
                .itemsProcessed(50)
                .itemsTotal(50)
                .build();

        Map<String, OperationStatusDetail> progressMap = new HashMap<>();
        progressMap.put("GMAIL_SYNC_123", mockOperationDetail);

        mockStatusResponse = AggregatedRefreshStatusResponse.builder()
                .progressMap(progressMap)
                .refreshInProgress(false)
                .build();
    }

    @Nested
    @DisplayName("Trigger Full Refresh Tests")
    class TriggerFullRefreshTests {

        @Test
        @DisplayName("Should trigger full refresh successfully")
        void shouldTriggerFullRefreshSuccessfully() throws Exception {
            // Given
            doNothing().when(gmailService).syncAndProcessEmails();

            // When & Then
            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isAccepted())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.message", is("Full refresh triggered. Operations initiated asynchronously.")));

            // Verify that Gmail service was called asynchronously
            // Note: We can't directly verify the async call, but we can verify the method was set up
            verify(gmailService, timeout(1000).times(1)).syncAndProcessEmails();
        }

        @Test
        @DisplayName("Should handle Gmail service exception gracefully")
        void shouldHandleGmailServiceExceptionGracefully() throws Exception {
            // Given
            doThrow(new RuntimeException("Gmail service error")).when(gmailService).syncAndProcessEmails();

            // When & Then
            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isAccepted())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.message", is("Full refresh triggered. Operations initiated asynchronously.")));

            // Verify that the exception doesn't prevent the response
            verify(gmailService, timeout(1000).times(1)).syncAndProcessEmails();
        }

        @Test
        @DisplayName("Should accept POST requests only")
        void shouldAcceptPostRequestsOnly() throws Exception {
            // Test GET request should fail
            mockMvc.perform(get("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isMethodNotAllowed());

            // Test PUT request should fail
            mockMvc.perform(put("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isMethodNotAllowed());

            // Test DELETE request should fail
            mockMvc.perform(delete("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isMethodNotAllowed());
        }

        @Test
        @DisplayName("Should return JSON response with correct content type")
        void shouldReturnJsonResponseWithCorrectContentType() throws Exception {
            // When & Then
            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isAccepted())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(header().string("Content-Type", containsString("application/json")));
        }
    }

    @Nested
    @DisplayName("Get Overall Status Tests")
    class GetOverallStatusTests {

        @Test
        @DisplayName("Should return overall refresh status successfully")
        void shouldReturnOverallRefreshStatusSuccessfully() throws Exception {
            // Given
            given(refreshTrackingService.getOverallRefreshStatus()).willReturn(mockStatusResponse);

            // When & Then
            mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.refreshInProgress", is(false)))
                    .andExpect(jsonPath("$.progressMap", hasKey("GMAIL_SYNC_123")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123.accountNumber", is("GMAIL_SYNC_123")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123.accountName", is("Email Processing")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123.status", is("COMPLETED")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123.itemsProcessed", is(50)))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123.itemsTotal", is(50)))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123.errorMessage").doesNotExist());

            verify(refreshTrackingService, times(1)).getOverallRefreshStatus();
        }

        @Test
        @DisplayName("Should return status with refresh in progress")
        void shouldReturnStatusWithRefreshInProgress() throws Exception {
            // Given
            OperationStatusDetail inProgressDetail = OperationStatusDetail.builder()
                    .accountNumber("GMAIL_SYNC_456")
                    .accountName("Email Processing In Progress")
                    .status(RefreshJobStatus.PROCESSING_IN_PROGRESS)
                    .startTime(LocalDateTime.now().minusMinutes(2))
                    .lastUpdateTime(LocalDateTime.now())
                    .errorMessage(null)
                    .history(List.of())
                    .itemsProcessed(25)
                    .itemsTotal(100)
                    .build();

            Map<String, OperationStatusDetail> progressMap = new HashMap<>();
            progressMap.put("GMAIL_SYNC_456", inProgressDetail);

            AggregatedRefreshStatusResponse inProgressResponse = AggregatedRefreshStatusResponse.builder()
                    .progressMap(progressMap)
                    .refreshInProgress(true)
                    .build();

            given(refreshTrackingService.getOverallRefreshStatus()).willReturn(inProgressResponse);

            // When & Then
            mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.refreshInProgress", is(true)))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_456.status", is("PROCESSING_IN_PROGRESS")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_456.itemsProcessed", is(25)))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_456.itemsTotal", is(100)));
        }

        @Test
        @DisplayName("Should return status with error details")
        void shouldReturnStatusWithErrorDetails() throws Exception {
            // Given
            OperationStatusDetail errorDetail = OperationStatusDetail.builder()
                    .accountNumber("GMAIL_SYNC_789")
                    .accountName("Email Processing Failed")
                    .status(RefreshJobStatus.ERROR)
                    .startTime(LocalDateTime.now().minusMinutes(5))
                    .lastUpdateTime(LocalDateTime.now().minusMinutes(1))
                    .errorMessage("Authentication failed: Invalid credentials")
                    .history(List.of())
                    .itemsProcessed(0)
                    .itemsTotal(0)
                    .build();

            Map<String, OperationStatusDetail> progressMap = new HashMap<>();
            progressMap.put("GMAIL_SYNC_789", errorDetail);

            AggregatedRefreshStatusResponse errorResponse = AggregatedRefreshStatusResponse.builder()
                    .progressMap(progressMap)
                    .refreshInProgress(false)
                    .build();

            given(refreshTrackingService.getOverallRefreshStatus()).willReturn(errorResponse);

            // When & Then
            mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.refreshInProgress", is(false)))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_789.status", is("ERROR")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_789.errorMessage", is("Authentication failed: Invalid credentials")));
        }

        @Test
        @DisplayName("Should return empty status when no operations exist")
        void shouldReturnEmptyStatusWhenNoOperationsExist() throws Exception {
            // Given
            AggregatedRefreshStatusResponse emptyResponse = AggregatedRefreshStatusResponse.builder()
                    .progressMap(new HashMap<>())
                    .refreshInProgress(false)
                    .build();

            given(refreshTrackingService.getOverallRefreshStatus()).willReturn(emptyResponse);

            // When & Then
            mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.refreshInProgress", is(false)))
                    .andExpect(jsonPath("$.progressMap", anEmptyMap()));
        }

        @Test
        @DisplayName("Should handle service exception and return error response")
        void shouldHandleServiceExceptionAndReturnErrorResponse() throws Exception {
            // Given
            given(refreshTrackingService.getOverallRefreshStatus()).willThrow(new RuntimeException("Service unavailable"));

            // When & Then
            mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isInternalServerError());

            verify(refreshTrackingService, times(1)).getOverallRefreshStatus();
        }

        @Test
        @DisplayName("Should accept GET requests only")
        void shouldAcceptGetRequestsOnly() throws Exception {
            // Test POST request should fail
            mockMvc.perform(post("/api/v1/refresh/status"))
                    .andExpect(status().isMethodNotAllowed());

            // Test PUT request should fail
            mockMvc.perform(put("/api/v1/refresh/status"))
                    .andExpect(status().isMethodNotAllowed());

            // Test DELETE request should fail
            mockMvc.perform(delete("/api/v1/refresh/status"))
                    .andExpect(status().isMethodNotAllowed());
        }
    }

    @Nested
    @DisplayName("Multiple Operations Status Tests")
    class MultipleOperationsStatusTests {

        @Test
        @DisplayName("Should return status for multiple concurrent operations")
        void shouldReturnStatusForMultipleConcurrentOperations() throws Exception {
            // Given
            OperationStatusDetail completedOperation = OperationStatusDetail.builder()
                    .accountNumber("GMAIL_SYNC_111")
                    .accountName("Completed Operation")
                    .status(RefreshJobStatus.COMPLETED)
                    .startTime(LocalDateTime.now().minusMinutes(10))
                    .lastUpdateTime(LocalDateTime.now().minusMinutes(5))
                    .errorMessage(null)
                    .history(List.of())
                    .itemsProcessed(100)
                    .itemsTotal(100)
                    .build();

            OperationStatusDetail inProgressOperation = OperationStatusDetail.builder()
                    .accountNumber("GMAIL_SYNC_222")
                    .accountName("In Progress Operation")
                    .status(RefreshJobStatus.PROCESSING_IN_PROGRESS)
                    .startTime(LocalDateTime.now().minusMinutes(3))
                    .lastUpdateTime(LocalDateTime.now())
                    .errorMessage(null)
                    .history(List.of())
                    .itemsProcessed(30)
                    .itemsTotal(75)
                    .build();

            Map<String, OperationStatusDetail> progressMap = new HashMap<>();
            progressMap.put("GMAIL_SYNC_111", completedOperation);
            progressMap.put("GMAIL_SYNC_222", inProgressOperation);

            AggregatedRefreshStatusResponse multipleOperationsResponse = AggregatedRefreshStatusResponse.builder()
                    .progressMap(progressMap)
                    .refreshInProgress(true) // Because one operation is still in progress
                    .build();

            given(refreshTrackingService.getOverallRefreshStatus()).willReturn(multipleOperationsResponse);

            // When & Then
            mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.refreshInProgress", is(true)))
                    .andExpect(jsonPath("$.progressMap", hasKey("GMAIL_SYNC_111")))
                    .andExpect(jsonPath("$.progressMap", hasKey("GMAIL_SYNC_222")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_111.status", is("COMPLETED")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_222.status", is("PROCESSING_IN_PROGRESS")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_111.itemsProcessed", is(100)))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_222.itemsProcessed", is(30)));
        }

        @Test
        @DisplayName("Should return status for operations with different failure modes")
        void shouldReturnStatusForOperationsWithDifferentFailureModes() throws Exception {
            // Given
            OperationStatusDetail loginFailedOperation = OperationStatusDetail.builder()
                    .accountNumber("GMAIL_SYNC_333")
                    .accountName("Login Failed Operation")
                    .status(RefreshJobStatus.LOGIN_FAILED)
                    .startTime(LocalDateTime.now().minusMinutes(8))
                    .lastUpdateTime(LocalDateTime.now().minusMinutes(7))
                    .errorMessage("Authentication failed")
                    .history(List.of())
                    .itemsProcessed(0)
                    .itemsTotal(0)
                    .build();

            OperationStatusDetail processingFailedOperation = OperationStatusDetail.builder()
                    .accountNumber("GMAIL_SYNC_444")
                    .accountName("Processing Failed Operation")
                    .status(RefreshJobStatus.PROCESSING_FAILED)
                    .startTime(LocalDateTime.now().minusMinutes(6))
                    .lastUpdateTime(LocalDateTime.now().minusMinutes(4))
                    .errorMessage("Email parsing failed")
                    .history(List.of())
                    .itemsProcessed(15)
                    .itemsTotal(50)
                    .build();

            Map<String, OperationStatusDetail> progressMap = new HashMap<>();
            progressMap.put("GMAIL_SYNC_333", loginFailedOperation);
            progressMap.put("GMAIL_SYNC_444", processingFailedOperation);

            AggregatedRefreshStatusResponse failedOperationsResponse = AggregatedRefreshStatusResponse.builder()
                    .progressMap(progressMap)
                    .refreshInProgress(false) // All operations are in terminal states
                    .build();

            given(refreshTrackingService.getOverallRefreshStatus()).willReturn(failedOperationsResponse);

            // When & Then
            mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.refreshInProgress", is(false)))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_333.status", is("LOGIN_FAILED")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_333.errorMessage", is("Authentication failed")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_444.status", is("PROCESSING_FAILED")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_444.errorMessage", is("Email parsing failed")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_444.itemsProcessed", is(15)));
        }
    }

    @Nested
    @DisplayName("API Response Format Tests")
    class ApiResponseFormatTests {

        @Test
        @DisplayName("Should return proper JSON structure for status response")
        void shouldReturnProperJsonStructureForStatusResponse() throws Exception {
            // Given
            given(refreshTrackingService.getOverallRefreshStatus()).willReturn(mockStatusResponse);

            // When & Then
            mockMvc.perform(get("/api/v1/refresh/status"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$", hasKey("refreshInProgress")))
                    .andExpect(jsonPath("$", hasKey("progressMap")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123", hasKey("accountNumber")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123", hasKey("accountName")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123", hasKey("status")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123", hasKey("startTime")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123", hasKey("lastUpdateTime")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123", hasKey("history")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123", hasKey("itemsProcessed")))
                    .andExpect(jsonPath("$.progressMap.GMAIL_SYNC_123", hasKey("itemsTotal")));
        }

        @Test
        @DisplayName("Should return proper JSON structure for trigger response")
        void shouldReturnProperJsonStructureForTriggerResponse() throws Exception {
            // When & Then
            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh"))
                    .andExpect(status().isAccepted())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$", hasKey("message")))
                    .andExpect(jsonPath("$.message", notNullValue()));
        }
    }

    @Nested
    @DisplayName("Endpoint Security Tests")
    class EndpointSecurityTests {

        @Test
        @DisplayName("Should handle malformed JSON gracefully in trigger endpoint")
        void shouldHandleMalformedJsonGracefullyInTriggerEndpoint() throws Exception {
            // Even though the trigger endpoint doesn't accept a body, 
            // we should test that malformed content doesn't break it
            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{ invalid json"))
                    .andExpect(status().isAccepted());
        }

        @Test
        @DisplayName("Should handle different content types gracefully")
        void shouldHandleDifferentContentTypesGracefully() throws Exception {
            // Test with different content types
            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh")
                    .contentType(MediaType.TEXT_PLAIN))
                    .andExpect(status().isAccepted());

            mockMvc.perform(post("/api/v1/refresh/trigger-full-refresh")
                    .contentType(MediaType.APPLICATION_XML))
                    .andExpect(status().isAccepted());
        }
    }
}