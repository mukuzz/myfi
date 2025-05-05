package com.myfi.service;

import com.myfi.bankscraping.service.BankScrapper;
import com.myfi.model.Account;
import com.myfi.model.Account.AccountType;
import com.myfi.repository.AccountRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myfi.mailscraping.constants.Constants;
import java.math.BigDecimal;
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

    @Autowired
    private AccountHistoryService accountHistoryService;

    private final List<BankScrapper> bankScrapers;

    @Autowired
    public AccountService(AccountRepository accountRepository, AccountHistoryService accountHistoryService, List<BankScrapper> bankScrapers) {
        this.accountRepository = accountRepository;
        this.accountHistoryService = accountHistoryService;
        this.bankScrapers = bankScrapers;
    }

    @Transactional(readOnly = true)
    public List<Account> getAllAccounts() {
        List<Account> accounts = accountRepository.findAll();
        accounts.forEach(this::populateLatestBalance);
        return accounts;
    }

    @Transactional(readOnly = true)
    public Optional<Account> getAccountById(Long id) {
        return accountRepository.findById(id).map(account -> {
            populateLatestBalance(account);
            return account;
        });
    }

    @Transactional(readOnly = true)
    public Optional<Account> getAccountByAccountNumber(String accountNumber) {
        return accountRepository.findByAccountNumber(accountNumber).map(account -> {
            populateLatestBalance(account);
            return account;
        });
    }

    @Transactional
    public Account createAccount(Account account) {
        account.setCreatedAt(LocalDateTime.now());
        if (account.getBalance() == null) {
            throw new IllegalArgumentException("Initial account balance must be provided.");
        }
         if (account.getCurrency() == null) {
             throw new IllegalArgumentException("Account currency must be provided.");
         }
        account.setActive(true);

        BigDecimal initialBalance = account.getBalance();
        Account savedAccount = accountRepository.save(account);

        accountHistoryService.createAccountHistoryRecord(savedAccount.getId(), initialBalance);

        savedAccount.setBalance(initialBalance);

        return savedAccount;
    }

    @Transactional
    public Optional<Account> updateAccount(Long id, Account accountDetails) {
        return accountRepository.findById(id)
                .map(existingAccount -> {
                    existingAccount.setName(accountDetails.getName());
                    existingAccount.setType(accountDetails.getType());
                    existingAccount.setCurrency(accountDetails.getCurrency());
                    existingAccount.setActive(accountDetails.isActive());
                    existingAccount.setAccountNumber(accountDetails.getAccountNumber());
                    existingAccount.setParentAccountId(accountDetails.getParentAccountId());
                    existingAccount.setUpdatedAt(LocalDateTime.now());
                    Account updatedAccount = accountRepository.save(existingAccount);
                    populateLatestBalance(updatedAccount);
                    return updatedAccount;
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

        for (String bankName : Constants.SUPPORTED_BANK_EMAILS.keySet()) {
            supportedAccountsMap.get(AccountType.CREDIT_CARD.name()).add(bankName);
        }

        return supportedAccountsMap;
    }

    private void populateLatestBalance(Account account) {
        BigDecimal latestBalance = accountHistoryService.getLatestBalanceForAccount(account.getId())
                                        .orElse(BigDecimal.ZERO);
        account.setBalance(latestBalance);
    }

    public Account getAccountByCardLast4DigitsNumber(String cardNumber) {
        return accountRepository.findAll().stream()
            .filter(account -> account.getAccountNumber().endsWith(cardNumber))
            .findFirst()
            .orElse(null);
    }
} 