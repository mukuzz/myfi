package com.myfi.credentials.repository;

import com.myfi.credentials.entity.GenericCredentialEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GenericCredentialRepository extends JpaRepository<GenericCredentialEntity, Long> {
    Optional<GenericCredentialEntity> findByCredentialKey(String credentialKey);
    void deleteByCredentialKey(String credentialKey);
} 