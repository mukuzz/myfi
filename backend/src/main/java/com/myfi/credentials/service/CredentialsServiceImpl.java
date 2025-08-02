package com.myfi.credentials.service;

import com.myfi.credentials.entity.GenericCredentialEntity;
import com.myfi.credentials.repository.GenericCredentialRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Service
public class CredentialsServiceImpl implements CredentialsService {

    private final GenericCredentialRepository genericCredentialRepository;

    @Autowired
    public CredentialsServiceImpl(GenericCredentialRepository genericCredentialRepository) {
        this.genericCredentialRepository = genericCredentialRepository;
    }

    @Override
    @Transactional
    public void saveCredential(String key, String value) throws Exception {
        log.info("Attempting to save generic credential for key: {} to database", key);

        Optional<GenericCredentialEntity> existingCredentialOpt = genericCredentialRepository.findByCredentialKey(key);
        GenericCredentialEntity credentialEntity;
        if (existingCredentialOpt.isPresent()) {
            log.info("Updating existing generic credential for key: {}", key);
            credentialEntity = existingCredentialOpt.get();
            credentialEntity.setValue(value);
        } else {
            log.info("Saving new generic credential for key: {}", key);
            credentialEntity = new GenericCredentialEntity(key, value);
        }
        genericCredentialRepository.save(credentialEntity);
        log.info("Successfully saved generic credential for key: {} to database", key);
    }

    @Override
    @Transactional(readOnly = true)
    public String getCredential(String key) throws Exception {
        log.info("Attempting to retrieve generic credential for key: {} from database", key);
        Optional<GenericCredentialEntity> credentialEntityOpt = genericCredentialRepository.findByCredentialKey(key);
        if (credentialEntityOpt.isEmpty()) {
            log.warn("No generic credential found in database for key: {}", key);
            return null; 
        }
        GenericCredentialEntity credentialEntity = credentialEntityOpt.get();
        log.info("Successfully retrieved generic credential from database for key: {}", key);
        return credentialEntity.getValue();
    }

    @Override
    @Transactional
    public void deleteCredential(String key) throws Exception {
        log.info("Deleting generic credential for key: {}", key);
        genericCredentialRepository.deleteByCredentialKey(key); // Assuming this method exists or will be added
        log.info("Successfully deleted generic credential for key: {}", key);
    }
} 