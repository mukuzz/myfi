package com.myfi.mailscraping.controller;

import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.constraints.NotBlank;

import com.myfi.mailscraping.service.GoogleAuthService;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/google")
public class GoogleAuthController {

    private static final Logger logger = LoggerFactory.getLogger(GoogleAuthController.class);

    @Autowired
    private GoogleAuthService googleAuthService;

    @Value("${oauth.frontend.redirect.base}")
    private String frontendRedirectBase;

    @GetMapping("/url")
    public ResponseEntity<Map<String, String>> getAuthorizationUrl(@RequestHeader("X-Master-Key") @NotBlank String masterKey) {
        if (googleAuthService.hasRefreshToken()) {
            logger.info("Google refresh token already exists, providing auth URL for potential re-auth.");
        }
        // Get the URL from the service, now passing the masterKey
        String url = googleAuthService.getAuthorizationUrl(masterKey);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/callback")
    public void handleCallback(@RequestParam(value = "code", required = false) String code,
                               @RequestParam(value = "error", required = false) String error,
                               HttpServletResponse response) throws IOException {

        String redirectUrl;

        if (error != null) {
            logger.error("Google Auth Error received: {}", error);
            redirectUrl = frontendRedirectBase + "/?google_auth_error=" + error;
        } else if (code == null) {
            logger.error("Google Auth Error: No authorization code received.");
            redirectUrl = frontendRedirectBase + "/?google_auth_error=missing_code";
        } else {
            // Delegate token exchange and storage to the service
            boolean success = googleAuthService.exchangeCodeForTokensAndStore(code);

            if (success) {
                logger.info("Google token exchange successful via service. Redirecting to frontend.");
                redirectUrl = frontendRedirectBase + "/?google_auth_success=true";
            } else {
                logger.error("Google token exchange failed via service. Redirecting to frontend.");
                redirectUrl = frontendRedirectBase + "/?google_auth_error=token_exchange_failed";
            }
        }

        logger.info("Redirecting back to frontend: {}", redirectUrl);
        response.sendRedirect(redirectUrl);
    }
}