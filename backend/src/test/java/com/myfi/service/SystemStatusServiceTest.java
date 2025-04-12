package com.myfi.service;

import com.myfi.model.SystemStatus;
import com.myfi.repository.SystemStatusRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SystemStatusServiceTest {

    @Mock
    private SystemStatusRepository systemStatusRepository;

    @InjectMocks
    private SystemStatusService systemStatusService;

    private static final Long FIXED_ID = 1L;

    @Test
    void updateLastScrapeTime_shouldCreateNewStatusWhenNotFound() {
        when(systemStatusRepository.findById(FIXED_ID)).thenReturn(Optional.empty());
        when(systemStatusRepository.save(any(SystemStatus.class))).thenAnswer(invocation -> invocation.getArgument(0));

        systemStatusService.updateLastScrapeTime();

        verify(systemStatusRepository).findById(FIXED_ID);
        verify(systemStatusRepository).save(argThat(status ->
                status.getId().equals(FIXED_ID)
        ));
    }

    @Test
    void updateLastScrapeTime_shouldUpdateExistingStatusWhenFound() {
        SystemStatus existingStatus = new SystemStatus();
        existingStatus.setId(FIXED_ID);
        existingStatus.setLastScrapeTime(Instant.now().minusSeconds(60).toEpochMilli()); // Set an old time

        when(systemStatusRepository.findById(FIXED_ID)).thenReturn(Optional.of(existingStatus));
        when(systemStatusRepository.save(any(SystemStatus.class))).thenAnswer(invocation -> invocation.getArgument(0));

        long timeBeforeUpdate = Instant.now().toEpochMilli();
        systemStatusService.updateLastScrapeTime();
        long timeAfterUpdate = Instant.now().toEpochMilli();

        verify(systemStatusRepository).findById(FIXED_ID);
        verify(systemStatusRepository).save(argThat(status ->
                status.getId().equals(FIXED_ID) &&
                status.getLastScrapeTime() >= timeBeforeUpdate &&
                status.getLastScrapeTime() <= timeAfterUpdate
        ));
    }

    @Test
    void getLastScrapeTime_shouldReturnTimeWhenStatusExists() {
        long expectedTime = Instant.now().toEpochMilli();
        SystemStatus existingStatus = new SystemStatus();
        existingStatus.setId(FIXED_ID);
        existingStatus.setLastScrapeTime(expectedTime);

        when(systemStatusRepository.findById(FIXED_ID)).thenReturn(Optional.of(existingStatus));

        Optional<Long> result = systemStatusService.getLastScrapeTime();

        assertTrue(result.isPresent());
        assertEquals(expectedTime, result.get());
        verify(systemStatusRepository).findById(FIXED_ID);
    }

    @Test
    void getLastScrapeTime_shouldReturnEmptyOptionalWhenStatusNotFound() {
        when(systemStatusRepository.findById(FIXED_ID)).thenReturn(Optional.empty());

        Optional<Long> result = systemStatusService.getLastScrapeTime();

        assertFalse(result.isPresent());
        verify(systemStatusRepository).findById(FIXED_ID);
    }
} 