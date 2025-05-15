package com.myfi.credentials.service;

import com.myfi.bankscraping.model.AccountCredentials;
import java.util.List;

public interface CredentialsService {

    void saveCredentials(String accountNumber, String accountName, String username, String password, String masterKey) throws Exception;

    AccountCredentials getCredentials(String accountNumber, String masterKey) throws Exception;

    List<AccountCredentials> getAllCredentials(String masterKey) throws Exception;

    void deleteCredentials(String accountNumber) throws Exception;
} 