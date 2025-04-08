package com.myfi.controller;

import com.myfi.service.SystemStatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/status")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET})
@RequiredArgsConstructor
public class SystemStatusController {

    private final SystemStatusService systemStatusService;

    @GetMapping("/last-scrape-time")
    public ResponseEntity<Long> getLastScrapeTime() {
        return systemStatusService.getLastScrapeTime()
                .map(ResponseEntity::ok) // If present, wrap in 200 OK
                .orElse(ResponseEntity.notFound().build()); // If empty, return 404 Not Found
    }
} 