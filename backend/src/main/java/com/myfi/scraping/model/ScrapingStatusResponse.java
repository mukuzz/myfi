package com.myfi.scraping.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScrapingStatusResponse {
    private Map<String, ScrapingProgress> progressMap;
    private boolean refreshInProgress;
} 