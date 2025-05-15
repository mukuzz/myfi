package com.myfi.credentials.service;

import com.myfi.bankscraping.model.AccountCredentials;
import com.myfi.credentials.entity.AccountCredentialEntity;
import com.myfi.credentials.entity.GenericCredentialEntity;
import com.myfi.credentials.repository.CredentialRepository;
import com.myfi.credentials.repository.GenericCredentialRepository;
import com.myfi.utils.EncryptionUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
public class CredentialsServiceImpl implements CredentialsService { // Renamed class

    private final CredentialRepository credentialRepository;
    private final GenericCredentialRepository genericCredentialRepository;

    private String masterKey;

    public void setMasterKey(String masterKey) {
        this.masterKey = masterKey;
    }

    @Autowired
    public CredentialsServiceImpl(CredentialRepository credentialRepository, GenericCredentialRepository genericCredentialRepository) { // Updated constructor
        this.credentialRepository = credentialRepository;
        this.genericCredentialRepository = genericCredentialRepository;
    }

    @Override
    @Transactional
    public void saveAccountCredentials(String accountNumber, String accountName, String username, String password, String masterKey) throws Exception {
        log.info("Attempting to save account credentials for account number: {} and account name: {} to database", accountNumber, accountName);
        String salt = EncryptionUtil.generateSalt();
        //TODO: enctypt the account name and account number as well later
        String encryptedUsername = EncryptionUtil.encrypt(username, masterKey, salt);
        String encryptedPassword = EncryptionUtil.encrypt(password, masterKey, salt);

        Optional<AccountCredentialEntity> existingCredentialOpt = credentialRepository.findByAccountNumber(accountNumber);
        AccountCredentialEntity credentialEntity;
        if (existingCredentialOpt.isPresent()) {
            log.info("Updating existing account credentials for account number: {}", accountNumber);
            credentialEntity = existingCredentialOpt.get();
            credentialEntity.setEncryptedUsername(encryptedUsername);
            credentialEntity.setEncryptedPassword(encryptedPassword);
            credentialEntity.setSalt(salt); // Update salt as well, as new encryption uses new salt
            credentialEntity.setAccountName(accountName); // Update account name
        } else {
            log.info("Saving new account credentials for account number: {} and account name: {}", accountNumber, accountName);
            credentialEntity = new AccountCredentialEntity(accountNumber, accountName, encryptedUsername, encryptedPassword, salt);
        }
        credentialRepository.save(credentialEntity);
        log.info("Successfully saved account credentials for account number: {} and account name: {} to database", accountNumber, accountName);
    }

    @Override
    @Transactional(readOnly = true)
    public AccountCredentials getAccountCredentials(String accountNumber, String masterKey) throws Exception {
        log.info("Attempting to retrieve account credentials for account number: {} from database", accountNumber);
        Optional<AccountCredentialEntity> credentialEntityOpt = credentialRepository.findByAccountNumber(accountNumber);
        if (credentialEntityOpt.isEmpty()) {
            log.warn("No account credentials found in database for account number: {}", accountNumber);
            return null; // Or throw custom CredentialsNotFoundException
        }
        AccountCredentialEntity credentialEntity = credentialEntityOpt.get();
        String decryptedUsername = EncryptionUtil.decrypt(credentialEntity.getEncryptedUsername(), masterKey, credentialEntity.getSalt());
        String decryptedPassword = EncryptionUtil.decrypt(credentialEntity.getEncryptedPassword(), masterKey, credentialEntity.getSalt());
        log.info("Successfully retrieved and decrypted account credentials from database for account number: {}", accountNumber);
        return AccountCredentials.builder()
                .username(decryptedUsername)
                .password(decryptedPassword)
                .accountNumber(credentialEntity.getAccountNumber())
                .accountName(credentialEntity.getAccountName()) // Use actual account name from entity
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccountCredentials> getAllAccountCredentials(String masterKey) throws Exception {
        log.info("Attempting to retrieve all stored account credentials from database.");
        List<AccountCredentialEntity> allCredentialEntities = credentialRepository.findAll();
        if (allCredentialEntities.isEmpty()) {
            log.info("No account credentials stored in database.");
            return List.of();
        }

        List<AccountCredentials> allDecryptedCredentials = allCredentialEntities.stream()
                .map(entity -> {
                    try {
                        String decryptedUsername = EncryptionUtil.decrypt(entity.getEncryptedUsername(), masterKey, entity.getSalt());
                        String decryptedPassword = EncryptionUtil.decrypt(entity.getEncryptedPassword(), masterKey, entity.getSalt());
                        return AccountCredentials.builder()
                                .username(decryptedUsername)
                                .password(decryptedPassword)
                                .accountNumber(entity.getAccountNumber())
                                .accountName(entity.getAccountName()) // Use actual account name from entity
                                .build();
                    } catch (Exception e) {
                        log.error("Failed to decrypt password for account number: {} from database. Error: {}", entity.getAccountNumber(), e.getMessage());
                        // Propagate error; a single failure might indicate a systemic issue (e.g., wrong masterKey)
                        throw new RuntimeException("Failed to decrypt account credentials for account: " + entity.getAccountNumber(), e);
                    }
                })
                .collect(Collectors.toList());
        log.info("Successfully retrieved and decrypted {} account credential sets from database.", allDecryptedCredentials.size());
        return allDecryptedCredentials;
    }

    @Override
    @Transactional
    public void deleteAccountCredentials(String accountNumber) throws Exception {
        log.info("Deleting account credentials for account number: {}", accountNumber);
        credentialRepository.deleteByAccountNumber(accountNumber);
        log.info("Successfully deleted account credentials for account number: {}", accountNumber);
    }

    // Implementation for Generic Key-Value Credentials
    @Override
    @Transactional
    public void saveCredential(String key, String value, String masterKey) throws Exception {
        log.info("Attempting to save generic credential for key: {} to database", key);
        String salt = EncryptionUtil.generateSalt();
        String encryptedValue = EncryptionUtil.encrypt(value, masterKey, salt);

        Optional<GenericCredentialEntity> existingCredentialOpt = genericCredentialRepository.findByCredentialKey(key);
        GenericCredentialEntity credentialEntity;
        if (existingCredentialOpt.isPresent()) {
            log.info("Updating existing generic credential for key: {}", key);
            credentialEntity = existingCredentialOpt.get();
            credentialEntity.setEncryptedValue(encryptedValue);
            credentialEntity.setSalt(salt); // Update salt as new encryption uses new salt
        } else {
            log.info("Saving new generic credential for key: {}", key);
            credentialEntity = new GenericCredentialEntity(key, encryptedValue, salt);
        }
        genericCredentialRepository.save(credentialEntity);
        log.info("Successfully saved generic credential for key: {} to database", key);
    }

    @Override
    @Transactional(readOnly = true)
    public String getCredential(String key, String masterKey) throws Exception {
        if (masterKey == null || masterKey.isBlank()) {
            masterKey = this.masterKey;
        }
        log.info("Attempting to retrieve generic credential for key: {} from database", key);
        Optional<GenericCredentialEntity> credentialEntityOpt = genericCredentialRepository.findByCredentialKey(key);
        if (credentialEntityOpt.isEmpty()) {
            log.warn("No generic credential found in database for key: {}", key);
            // Consider throwing a specific exception, e.g., CredentialNotFoundException
            return null; 
        }
        GenericCredentialEntity credentialEntity = credentialEntityOpt.get();
        String decryptedValue = EncryptionUtil.decrypt(credentialEntity.getEncryptedValue(), masterKey, credentialEntity.getSalt());
        log.info("Successfully retrieved and decrypted generic credential from database for key: {}", key);
        return decryptedValue;
    }

    @Override
    @Transactional
    public void deleteCredential(String key) throws Exception {
        log.info("Deleting generic credential for key: {}", key);
        genericCredentialRepository.deleteByCredentialKey(key); // Assuming this method exists or will be added
        log.info("Successfully deleted generic credential for key: {}", key);
    }
} 