package com.myfi.service;

import com.myfi.model.SystemStatus;
import com.myfi.repository.SystemStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SystemStatusService {

    private final SystemStatusRepository systemStatusRepository;
    private static final Long FIXED_ID = 1L; // Define the fixed ID

    @Transactional // Ensure atomicity
    public void updateLastScrapeTime() {
        SystemStatus status = systemStatusRepository.findById(FIXED_ID)
                .orElseGet(() -> {
                    SystemStatus newStatus = new SystemStatus();
                    newStatus.setId(FIXED_ID); // Ensure ID is set for new instance
                    return newStatus;
                });
        
        status.setLastScrapeTime(Instant.now().toEpochMilli());
        systemStatusRepository.save(status);
    }

    @Transactional(readOnly = true) // Read-only transaction for query
    public Optional<Long> getLastScrapeTime() {
        return systemStatusRepository.findById(FIXED_ID)
                .map(SystemStatus::getLastScrapeTime); // Map to long if present
    }
}