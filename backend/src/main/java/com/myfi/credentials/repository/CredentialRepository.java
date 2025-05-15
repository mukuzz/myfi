package com.myfi.credentials.repository;

import com.myfi.credentials.entity.CredentialEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CredentialRepository extends JpaRepository<CredentialEntity, Long> {
    Optional<CredentialEntity> findByAccountNumber(String accountNumber);
    void deleteByAccountNumber(String accountNumber); // Optional: if direct deletion by account number is needed
} 