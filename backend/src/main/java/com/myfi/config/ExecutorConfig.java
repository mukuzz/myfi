package com.myfi.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class ExecutorConfig {

    // Define a bean for a fixed thread pool executor
    // The size can be configured via application properties if needed
    @Bean(name = "scrapingExecutor")
    public ExecutorService scrapingExecutorService() {
        // Using a fixed pool size of 4 as previously used, adjust as needed
        int poolSize = 10; 
        return Executors.newFixedThreadPool(poolSize);
    }

    // Optional: Add proper shutdown handling for the application context
    // This ensures the executor is gracefully shut down when the app stops.
    // Consider implementing DisposableBean in this config class or using
    // @PreDestroy on the bean method if returning the direct ExecutorService instance.
} 