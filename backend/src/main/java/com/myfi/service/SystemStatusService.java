package com.myfi.service;

import com.myfi.model.SystemStatus;
import com.myfi.repository.SystemStatusRepository;
import com.myfi.service.SystemStatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SystemStatusService {

    private final SystemStatusRepository systemStatusRepository;
    private static final Long FIXED_ID = 1L; // Define the fixed ID

    @Transactional // Ensure atomicity
    public void updateLastScrapeTime() {
        SystemStatus status = systemStatusRepository.findById(FIXED_ID)
                .orElse(new SystemStatus()); // Create if not found
        
        status.setLastScrapeTime(LocalDateTime.now());
        systemStatusRepository.save(status);
    }

    @Transactional(readOnly = true) // Read-only transaction for query
    public Optional<LocalDateTime> getLastScrapeTime() {
        return systemStatusRepository.findById(FIXED_ID)
                .map(SystemStatus::getLastScrapeTime); // Map to LocalDateTime if present
    }
}