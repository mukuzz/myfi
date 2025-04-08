package com.myfi.service;

import com.myfi.model.Account;
import com.myfi.model.Account.AccountType;
import com.myfi.repository.AccountRepository;
import com.myfi.scraping.service.BankScrapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.EnumSet;
import java.util.Set;
import java.util.ArrayList;

@Service
public class AccountService {

    @Autowired
    private AccountRepository accountRepository;

    private final List<BankScrapper> bankScrapers;

    @Autowired
    public AccountService(AccountRepository accountRepository, List<BankScrapper> bankScrapers) {
        this.accountRepository = accountRepository;
        this.bankScrapers = bankScrapers;
    }

    @Transactional(readOnly = true)
    public List<Account> getAllAccounts() {
        return accountRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Account> getAccountById(Long id) {
        return accountRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Account> getAccountByAccountNumber(String accountNumber) {
        return accountRepository.findByAccountNumber(accountNumber);
    }

    @Transactional
    public Account createAccount(Account account) {
        account.setCreatedAt(LocalDateTime.now());
        // Ensure balance is set if not provided, or handle as needed
        if (account.getBalance() == null) {
            // Set a default balance or throw an error, depending on requirements
            // For example, setting default balance to 0
            // account.setBalance(BigDecimal.ZERO);
             throw new IllegalArgumentException("Account balance must be provided.");
        }
         if (account.getCurrency() == null) {
             throw new IllegalArgumentException("Account currency must be provided.");
         }
        account.setActive(true); // Default to active
        return accountRepository.save(account);
    }

    @Transactional
    public Optional<Account> updateAccount(Long id, Account accountDetails) {
        return accountRepository.findById(id)
                .map(existingAccount -> {
                    existingAccount.setName(accountDetails.getName());
                    existingAccount.setType(accountDetails.getType());
                    existingAccount.setBalance(accountDetails.getBalance());
                    existingAccount.setCurrency(accountDetails.getCurrency());
                    existingAccount.setActive(accountDetails.isActive());
                    existingAccount.setAccountNumber(accountDetails.getAccountNumber());
                    existingAccount.setUpdatedAt(LocalDateTime.now());
                    return accountRepository.save(existingAccount);
                });
    }

    @Transactional
    public boolean deleteAccount(Long id) {
        return accountRepository.findById(id)
                .map(account -> {
                    accountRepository.delete(account);
                    return true;
                }).orElse(false);
    }

    public Map<String, List<String>> getSupportedAccounts() {
        Map<String, List<String>> supportedAccountsMap = EnumSet.allOf(AccountType.class).stream()
                .collect(Collectors.toMap(
                        AccountType::name,
                        type -> new ArrayList<>()
                ));

        if (bankScrapers != null) {
            for (BankScrapper scraper : bankScrapers) {
                String bankName = scraper.getBankName();
                Set<AccountType> supportedTypes = scraper.getSupportedAccountTypes();
                for (AccountType type : supportedTypes) {
                    supportedAccountsMap.get(type.name()).add(bankName);
                }
            }
        }

        return supportedAccountsMap;
    }
} 