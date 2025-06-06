package com.myfi.credentials.service;

import com.myfi.credentials.entity.GenericCredentialEntity;
import com.myfi.credentials.repository.GenericCredentialRepository;
import com.myfi.utils.EncryptionUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Service
public class CredentialsServiceImpl implements CredentialsService { // Renamed class

    private final GenericCredentialRepository genericCredentialRepository;

    private String masterKey;

    public void setMasterKey(String masterKey) {
        this.masterKey = masterKey;
    }

    @Autowired
    public CredentialsServiceImpl(GenericCredentialRepository genericCredentialRepository) { // Updated constructor
        this.genericCredentialRepository = genericCredentialRepository;
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