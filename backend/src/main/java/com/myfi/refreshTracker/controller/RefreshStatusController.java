package com.myfi.refreshTracker.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.myfi.refreshTracker.dto.AggregatedRefreshStatusResponse;
import com.myfi.refreshTracker.service.RefreshTrackingService;

@RestController
@RequestMapping("/api/v1/status")
public class RefreshStatusController {

    @Autowired
    private RefreshTrackingService refreshTrackingService;

    @GetMapping("/overall")
    public ResponseEntity<AggregatedRefreshStatusResponse> getOverallStatus() {
        return ResponseEntity.ok(refreshTrackingService.getOverallRefreshStatus());
    }
} 