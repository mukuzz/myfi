package com.myfi.credentials.service;

public interface CredentialsService {

    void saveCredential(String key, String value, String masterKey) throws Exception;

    String getCredential(String key, String masterKey) throws Exception;

    void deleteCredential(String key) throws Exception;

    void setMasterKey(String masterKey);
} 