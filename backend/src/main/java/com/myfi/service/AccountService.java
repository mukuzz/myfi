package com.myfi.service;

import com.myfi.model.Account;
import com.myfi.model.Account.AccountType;
import com.myfi.model.Transaction;
import com.myfi.model.Transaction.TransactionType;
import com.myfi.repository.AccountRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.Assert;

import com.myfi.credentials.service.CredentialsService;
import com.myfi.mailscraping.constants.Constants;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AccountService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private AccountHistoryService accountHistoryService;

    @Autowired
    private CredentialsService credentialsService;

    @Autowired
    public AccountService(AccountRepository accountRepository, AccountHistoryService accountHistoryService) {
        this.accountRepository = accountRepository;
        this.accountHistoryService = accountHistoryService;
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
                    try {
                        credentialsService.deleteAccountCredentials(account.getAccountNumber());
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to delete credentials for account number: " + account.getAccountNumber(), e);
                    }
                    return true;
                }).orElse(false);
    }

    public Map<AccountType, List<String>> getSupportedAccounts() {
        return Constants.SUPPORTED_ACCOUNTS;
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

    public Account getAccountByTypeAndName(AccountType type, String name) {
        return accountRepository.findAll().stream()
            .filter(account -> account.getType() == type && account.getName().equals(name))
            .findFirst()
            .orElse(null);
    }

    public void addToBalance(Account account, Transaction transaction) {
        Assert.notNull(account, "Account must not be null");
        Assert.notNull(transaction, "Transaction must not be null");
        BigDecimal amount = transaction.getAmount();
        BigDecimal balanceChange = amount.abs();
        if (transaction.getType() == TransactionType.DEBIT) {
            balanceChange = amount.negate();
        }
        updateBalance(account, balanceChange);
    }

    public void subtractFromBalance(Account account, Transaction transaction) {
        Assert.notNull(account, "Account must not be null");
        Assert.notNull(transaction, "Transaction must not be null");
        BigDecimal amount = transaction.getAmount();
        BigDecimal balanceChange = amount.abs();
        if (transaction.getType() == TransactionType.CREDIT) {
            balanceChange = amount.negate();
        }
        updateBalance(account, balanceChange);
    }

    public void updateBalance(Account account, BigDecimal balanceChange) {
        Assert.notNull(account, "Account must not be null");
        Assert.notNull(balanceChange, "Balance change must not be null");
        if (account.getParentAccountId() == null) {
            populateLatestBalance(account);
            BigDecimal newBalance = account.getBalance().add(balanceChange);
            accountHistoryService.createAccountHistoryRecord(account.getId(), newBalance);
            account.setBalance(newBalance);
        } else {
            accountRepository.findById(account.getParentAccountId()).ifPresent(parentAccount -> {
                // Ensure we don't get into an infinite loop if an account is its own parent
                if (!parentAccount.getId().equals(account.getId())) {
                    updateBalance(parentAccount, balanceChange);
                }
            });
        }
    }
}