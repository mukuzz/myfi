package com.myfi.credentials.service;

import com.myfi.bankscraping.model.AccountCredentials;
import java.util.List;

public interface CredentialsService {

    // Methods for Account Specific Credentials
    void saveAccountCredentials(String accountNumber, String accountName, String username, String password, String masterKey) throws Exception;

    AccountCredentials getAccountCredentials(String accountNumber, String masterKey) throws Exception;

    List<AccountCredentials> getAllAccountCredentials(String masterKey) throws Exception;

    void deleteAccountCredentials(String accountNumber) throws Exception;

    // Methods for Generic Key-Value Credentials
    void saveCredential(String key, String value, String masterKey) throws Exception;

    String getCredential(String key, String masterKey) throws Exception;

    void deleteCredential(String key) throws Exception;
} 