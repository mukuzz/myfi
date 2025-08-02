package com.myfi.credentials.service;

public interface CredentialsService {

    void saveCredential(String key, String value) throws Exception;

    String getCredential(String key) throws Exception;

    void deleteCredential(String key) throws Exception;
} 