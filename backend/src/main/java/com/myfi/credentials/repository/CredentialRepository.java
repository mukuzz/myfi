package com.myfi.credentials.repository;

import com.myfi.credentials.entity.AccountCredentialEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CredentialRepository extends JpaRepository<AccountCredentialEntity, Long> {
    Optional<AccountCredentialEntity> findByAccountNumber(String accountNumber);
    void deleteByAccountNumber(String accountNumber);
} 