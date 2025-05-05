package com.myfi.mailscraping.repository;

import com.myfi.mailscraping.model.GoogleOAuthToken; 
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GoogleOAuthTokenRepository extends JpaRepository<GoogleOAuthToken, Long> {
    
} 