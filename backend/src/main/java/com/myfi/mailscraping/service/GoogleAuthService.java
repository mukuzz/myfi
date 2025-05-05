package com.myfi.mailscraping.service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.auth.oauth2.TokenResponseException;
import com.google.api.client.auth.oauth2.AuthorizationCodeRequestUrl;
import com.google.api.client.auth.oauth2.TokenResponse;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleCredential;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.myfi.mailscraping.model.GoogleOAuthToken;
import com.myfi.mailscraping.repository.GoogleOAuthTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Instant;
import java.util.Optional;

@Service
public class GoogleAuthService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleAuthService.class);
    private static final Long FIXED_CREDENTIAL_ID = 1L;

    @Autowired
    private GoogleAuthorizationCodeFlow flow;

    @Autowired
    private HttpTransport httpTransport;

    @Autowired
    private JsonFactory jsonFactory;

    @Autowired
    private GoogleOAuthTokenRepository tokenRepository;

    @Value("${google.oauth.client.id}")
    private String clientId;

    @Value("${google.oauth.client.secret}")
    private String clientSecret;

    @Value("${google.oauth.redirect.uri}")
    private String redirectUri;

    private String accessToken = null;
    private Instant accessTokenExpiry = null;

    /**
     * Generates the Google OAuth 2.0 authorization URL.
     *
     * @return The authorization URL string.
     */
    public String getAuthorizationUrl() {
        AuthorizationCodeRequestUrl authorizationUrl = flow.newAuthorizationUrl();
        authorizationUrl.setRedirectUri(redirectUri);
        // AccessType and ApprovalPrompt are set on the flow itself during configuration

        String url = authorizationUrl.build();
        logger.info("Generated Google Auth URL via service: {}", url);
        return url;
    }

    @Transactional
    public boolean exchangeCodeForTokensAndStore(String code) {
        try {
            logger.info("Exchanging authorization code for tokens via GoogleAuthService.");
            TokenResponse tokenResponse = flow.newTokenRequest(code)
                    .setRedirectUri(redirectUri)
                    .execute();

            logger.info("Successfully obtained tokens.");

            // Store Access Token in memory
            this.accessToken = tokenResponse.getAccessToken();
            Long expiresInSeconds = tokenResponse.getExpiresInSeconds();
            if (expiresInSeconds != null) {
                this.accessTokenExpiry = Instant.now().plusSeconds(expiresInSeconds);
                logger.info("Access token stored in memory, expires at: {}", this.accessTokenExpiry);
            } else {
                this.accessTokenExpiry = null;
                logger.warn("Access token expiry time not provided in token response.");
            }

            // Persist Refresh Token (if received)
            String receivedRefreshToken = tokenResponse.getRefreshToken();
            if (receivedRefreshToken != null) {
                setRefreshToken(receivedRefreshToken);
                logger.info("New refresh token persisted successfully via GoogleAuthService.");
            } else {
                logger.warn("Did not receive a new refresh token during code exchange.");
                if (hasRefreshToken()) {
                    logger.info("An existing refresh token is already stored in DB.");
                }
            }

            return true;

        } catch (IOException e) {
            logger.error("Error exchanging authorization code for tokens: {}", e.getMessage(), e);
            this.accessToken = null;
            this.accessTokenExpiry = null;
            return false;
        }
    }

    @Transactional
    public void setRefreshToken(String token) {
        GoogleOAuthToken credential = tokenRepository.findById(FIXED_CREDENTIAL_ID)
                .orElse(new GoogleOAuthToken());
        
        credential.setRefreshToken(token);
        tokenRepository.save(credential);
        logger.info("Stored/Updated Google OAuth refresh token in database.");
    }

    @Transactional(readOnly = true)
    public String getRefreshToken() {
        Optional<GoogleOAuthToken> credentialOpt = tokenRepository.findById(FIXED_CREDENTIAL_ID);
        if (credentialOpt.isEmpty()) {
             logger.warn("Attempted to retrieve Google OAuth refresh token from DB, but none is stored.");
             return null;
        }
        return credentialOpt.get().getRefreshToken();
    }

    @Transactional(readOnly = true)
    public boolean hasRefreshToken() {
        return tokenRepository.existsById(FIXED_CREDENTIAL_ID);
    }

    @Transactional
    public void clearRefreshToken() {
        if (hasRefreshToken()) {
            tokenRepository.deleteById(FIXED_CREDENTIAL_ID);
            logger.warn("Deleted Google OAuth refresh token from database.");
        } else {
             logger.warn("Attempted to clear Google OAuth refresh token from DB, but none was found.");
        }
    }

    /**
     * Gets the stored access token.
     * Note: Does not check for expiry. Use getValidAccessToken() for that.
     * @return The stored access token, or null if none is stored.
     */
    public String getAccessToken() {
        return this.accessToken;
    }

    /**
     * Checks if the stored access token is likely still valid (based on stored expiry).
     * @return true if an access token exists and hasn't expired, false otherwise.
     */
    public boolean isAccessTokenValid() {
        return this.accessToken != null && this.accessTokenExpiry != null && Instant.now().isBefore(this.accessTokenExpiry);
    }

    public void clearAccessToken() {
        logger.warn("Clearing Google OAuth access token from memory.");
        this.accessToken = null;
        this.accessTokenExpiry = null;
    }

    public void clearAllTokens() {
        clearRefreshToken();
        clearAccessToken();
    }

    @Transactional(readOnly = true)
    public Credential getCredentials() throws IOException {
        String storedRefreshToken = getRefreshToken();
        if (storedRefreshToken == null) {
            throw new IllegalStateException("Cannot get Google credentials: No refresh token available in database.");
        }

        Credential credential = new GoogleCredential.Builder()
                .setClientSecrets(clientId, clientSecret)
                .setJsonFactory(jsonFactory)
                .setTransport(httpTransport)
                .build()
                .setRefreshToken(storedRefreshToken);

        try {
            boolean refreshed = credential.refreshToken();
            if (refreshed) {
                logger.info("Google token refreshed successfully using DB token.");
                this.accessToken = credential.getAccessToken();
                Long expiresIn = credential.getExpiresInSeconds();
                this.accessTokenExpiry = (expiresIn == null) ? null : Instant.now().plusSeconds(expiresIn);
                 logger.info("Updated stored access token info after refresh.");
            } else {
                 logger.info("Google token refresh was not needed or did not happen.");
            }
        } catch (TokenResponseException e) {
            if (e.getDetails() != null && e.getDetails().getError().equals("invalid_grant")) {
                logger.error("Error refreshing Google token (invalid_grant - likely revoked). Clearing stored DB token.", e);
                clearRefreshToken();
                clearAccessToken();
                throw new IOException("Failed to refresh token: Invalid grant. Please re-authenticate.", e);
            } else {
                 logger.error("Error refreshing Google token: {}", e.getMessage(), e);
                 throw e;
            }
        } catch (IOException e) {
            logger.error("IOException during Google token refresh: {}", e.getMessage(), e);
            throw e;
        }

        logger.info("Successfully obtained Google Credential using DB refresh token.");
        return credential;
    }
} 