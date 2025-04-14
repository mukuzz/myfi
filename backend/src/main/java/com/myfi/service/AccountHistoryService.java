package com.myfi.service;

import com.myfi.model.Account;
import com.myfi.model.AccountHistory;
import com.myfi.repository.AccountHistoryRepository;
import com.myfi.repository.AccountRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class AccountHistoryService {

    @Autowired
    private AccountHistoryRepository accountHistoryRepository;

    @Autowired
    private AccountRepository accountRepository; // Needed to fetch the Account entity

    @Transactional
    public AccountHistory saveAccountHistory(AccountHistory accountHistory) {
        // Ensure the associated account exists
        Account account = accountRepository.findById(accountHistory.getAccount().getId())
                .orElseThrow(() -> new EntityNotFoundException("Account not found with id: " + accountHistory.getAccount().getId()));
        accountHistory.setAccount(account);

        // Set recordedAt if not already set (though @PrePersist should handle this)
        if (accountHistory.getRecordedAt() == null) {
            accountHistory.setRecordedAt(LocalDateTime.now());
        }
        return accountHistoryRepository.save(accountHistory);
    }

    @Transactional
    public AccountHistory createAccountHistoryRecord(Long accountId, BigDecimal balance) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new EntityNotFoundException("Account not found with id: " + accountId));

        AccountHistory newHistory = new AccountHistory();
        newHistory.setAccount(account);
        newHistory.setBalance(balance);
        // recordedAt will be set by @PrePersist
        return accountHistoryRepository.save(newHistory);
    }

    public List<AccountHistory> getAccountHistoryByAccountId(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new EntityNotFoundException("Account not found with id: " + accountId));
        return accountHistoryRepository.findByAccountOrderByRecordedAtDesc(account);
    }

    public Optional<AccountHistory> getLatestAccountHistory(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new EntityNotFoundException("Account not found with id: " + accountId));
        return accountHistoryRepository.findTopByAccountOrderByRecordedAtDesc(account);
    }

    public Optional<AccountHistory> getAccountHistoryById(Long id) {
        return accountHistoryRepository.findById(id);
    }

    @Transactional
    public AccountHistory updateAccountHistory(Long id, AccountHistory accountHistoryDetails) {
        AccountHistory existingHistory = accountHistoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("AccountHistory not found with id: " + id));

        // Ensure the associated account exists if it's being changed (though changing account might not make sense)
        if (accountHistoryDetails.getAccount() != null && !accountHistoryDetails.getAccount().getId().equals(existingHistory.getAccount().getId())) {
             Account account = accountRepository.findById(accountHistoryDetails.getAccount().getId())
                .orElseThrow(() -> new EntityNotFoundException("Account not found with id: " + accountHistoryDetails.getAccount().getId()));
            existingHistory.setAccount(account);
        }

        existingHistory.setBalance(accountHistoryDetails.getBalance());
        // Potentially update recordedAt, though modifying history timestamps is usually discouraged
        if (accountHistoryDetails.getRecordedAt() != null) {
            existingHistory.setRecordedAt(accountHistoryDetails.getRecordedAt());
        }

        return accountHistoryRepository.save(existingHistory);
    }

    @Transactional
    public void deleteAccountHistory(Long id) {
        if (!accountHistoryRepository.existsById(id)) {
            throw new EntityNotFoundException("AccountHistory not found with id: " + id);
        }
        accountHistoryRepository.deleteById(id);
    }

    // Helper method to get the latest balance for an account
    public Optional<BigDecimal> getLatestBalanceForAccount(Long accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new EntityNotFoundException("Account not found with id: " + accountId));
        return accountHistoryRepository.findTopByAccountOrderByRecordedAtDesc(account)
                .map(AccountHistory::getBalance);
    }

} 