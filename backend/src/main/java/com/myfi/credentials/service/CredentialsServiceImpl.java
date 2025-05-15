package com.myfi.credentials.service;

import com.myfi.bankscraping.model.AccountCredentials;
import com.myfi.credentials.entity.CredentialEntity;
import com.myfi.credentials.repository.CredentialRepository;
import com.myfi.utils.EncryptionUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.context.annotation.Primary; // No longer needed
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
// @Primary // No longer needed as it's the only implementation
public class CredentialsServiceImpl implements CredentialsService { // Renamed class

    private final CredentialRepository credentialRepository;

    @Autowired
    public CredentialsServiceImpl(CredentialRepository credentialRepository) { // Updated constructor name
        this.credentialRepository = credentialRepository;
    }

    @Override
    @Transactional
    public void saveCredentials(String accountNumber, String accountName, String username, String password, String masterKey) throws Exception {
        log.info("Attempting to save credentials for account number: {} and account name: {} to database", accountNumber, accountName);
        String salt = EncryptionUtil.generateSalt();
        //TODO: enctypt the account name and account number as well later
        String encryptedUsername = EncryptionUtil.encrypt(username, masterKey, salt);
        String encryptedPassword = EncryptionUtil.encrypt(password, masterKey, salt);

        Optional<CredentialEntity> existingCredentialOpt = credentialRepository.findByAccountNumber(accountNumber);
        CredentialEntity credentialEntity;
        if (existingCredentialOpt.isPresent()) {
            log.info("Updating existing credentials for account number: {}", accountNumber);
            credentialEntity = existingCredentialOpt.get();
            credentialEntity.setEncryptedUsername(encryptedUsername);
            credentialEntity.setEncryptedPassword(encryptedPassword);
            credentialEntity.setSalt(salt); // Update salt as well, as new encryption uses new salt
            credentialEntity.setAccountName(accountName); // Update account name
        } else {
            log.info("Saving new credentials for account number: {} and account name: {}", accountNumber, accountName);
            credentialEntity = new CredentialEntity(accountNumber, accountName, encryptedUsername, encryptedPassword, salt);
        }
        credentialRepository.save(credentialEntity);
        log.info("Successfully saved credentials for account number: {} and account name: {} to database", accountNumber, accountName);
    }

    @Override
    @Transactional(readOnly = true)
    public AccountCredentials getCredentials(String accountNumber, String masterKey) throws Exception {
        log.info("Attempting to retrieve credentials for account number: {} from database", accountNumber);
        Optional<CredentialEntity> credentialEntityOpt = credentialRepository.findByAccountNumber(accountNumber);
        if (credentialEntityOpt.isEmpty()) {
            log.warn("No credentials found in database for account number: {}", accountNumber);
            return null; // Or throw custom CredentialsNotFoundException
        }
        CredentialEntity credentialEntity = credentialEntityOpt.get();
        String decryptedUsername = EncryptionUtil.decrypt(credentialEntity.getEncryptedUsername(), masterKey, credentialEntity.getSalt());
        String decryptedPassword = EncryptionUtil.decrypt(credentialEntity.getEncryptedPassword(), masterKey, credentialEntity.getSalt());
        log.info("Successfully retrieved and decrypted credentials from database for account number: {}", accountNumber);
        return AccountCredentials.builder()
                .username(decryptedUsername)
                .password(decryptedPassword)
                .accountNumber(credentialEntity.getAccountNumber())
                .accountName(credentialEntity.getAccountName()) // Use actual account name from entity
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AccountCredentials> getAllCredentials(String masterKey) throws Exception {
        log.info("Attempting to retrieve all stored credentials from database.");
        List<CredentialEntity> allCredentialEntities = credentialRepository.findAll();
        if (allCredentialEntities.isEmpty()) {
            log.info("No credentials stored in database.");
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
                        throw new RuntimeException("Failed to decrypt credentials for account: " + entity.getAccountNumber(), e);
                    }
                })
                .collect(Collectors.toList());
        log.info("Successfully retrieved and decrypted {} credential sets from database.", allDecryptedCredentials.size());
        return allDecryptedCredentials;
    }

    @Override
    public void deleteCredentials(String accountNumber) throws Exception {
        credentialRepository.deleteByAccountNumber(accountNumber);
    }
} 