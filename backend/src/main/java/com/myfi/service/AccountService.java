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

import com.myfi.mailscraping.constants.Constants;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AccountService {

    private static final Logger logger = LoggerFactory.getLogger(AccountService.class);

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private AccountHistoryService accountHistoryService;

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
        Assert.notNull(transaction.getAmount(), "Transaction amount must not be null");
        Assert.notNull(transaction.getType(), "Transaction type must not be null");
        
        BigDecimal amount = transaction.getAmount();
        BigDecimal balanceChange;
        
        // For account balance updates:
        // CREDIT = money coming in = positive balance change
        // DEBIT = money going out = negative balance change
        if (transaction.getType() == TransactionType.CREDIT) {
            balanceChange = amount.abs(); // Always positive for credits
        } else { // DEBIT
            balanceChange = amount.abs().negate(); // Always negative for debits
        }
        
        updateBalance(account, balanceChange);
    }

    public void subtractFromBalance(Account account, Transaction transaction) {
        Assert.notNull(account, "Account must not be null");
        Assert.notNull(transaction, "Transaction must not be null");
        Assert.notNull(transaction.getAmount(), "Transaction amount must not be null");
        Assert.notNull(transaction.getType(), "Transaction type must not be null");
        
        BigDecimal amount = transaction.getAmount();
        BigDecimal balanceChange;
        
        // For balance subtraction (used when deleting transactions):
        // Reverse the effect of the original transaction
        // If original was CREDIT (+), subtract means (-)
        // If original was DEBIT (-), subtract means (+)
        if (transaction.getType() == TransactionType.CREDIT) {
            balanceChange = amount.abs().negate(); // Remove the positive effect
        } else { // DEBIT
            balanceChange = amount.abs(); // Remove the negative effect (add back)
        }
        
        updateBalance(account, balanceChange);
    }

    public void updateBalance(Account account, BigDecimal balanceChange) {
        updateBalance(account, balanceChange, new HashSet<>());
    }

    @Transactional
    public Optional<Account> updateAccountBalance(Long id, BigDecimal newBalance) {
        Assert.notNull(newBalance, "New balance must not be null");
        
        return accountRepository.findById(id)
                .map(account -> {
                    try {
                        // Create new balance history record with the specified balance
                        accountHistoryService.createAccountHistoryRecord(account.getId(), newBalance);
                        
                        // Update the account object with the new balance
                        account.setBalance(newBalance);
                        account.setUpdatedAt(LocalDateTime.now());
                        
                        // Save the account (updates timestamp)
                        Account updatedAccount = accountRepository.save(account);
                        
                        // Ensure balance is populated
                        populateLatestBalance(updatedAccount);
                        
                        return updatedAccount;
                    } catch (Exception e) {
                        logger.error("Failed to update balance for account {}: {}", account.getId(), e.getMessage(), e);
                        throw new RuntimeException("Balance update failed for account " + account.getId(), e);
                    }
                });
    }
    
    private void updateBalance(Account account, BigDecimal balanceChange, Set<Long> visitedAccounts) {
        Assert.notNull(account, "Account must not be null");
        Assert.notNull(balanceChange, "Balance change must not be null");
        
        // Prevent infinite recursion by tracking visited accounts
        if (visitedAccounts.contains(account.getId())) {
            logger.warn("Circular reference detected in account hierarchy for account {}", account.getId());
            return;
        }
        
        visitedAccounts.add(account.getId());
        
        if (account.getParentAccountId() == null) {
            // This is a root account, update its balance directly
            try {
                populateLatestBalance(account);
                BigDecimal currentBalance = account.getBalance() != null ? account.getBalance() : BigDecimal.ZERO;
                BigDecimal newBalance = currentBalance.add(balanceChange);
                accountHistoryService.createAccountHistoryRecord(account.getId(), newBalance);
                account.setBalance(newBalance);
            } catch (Exception e) {
                logger.error("Failed to update balance for account {}: {}", account.getId(), e.getMessage(), e);
                throw new RuntimeException("Balance update failed for account " + account.getId(), e);
            }
        } else {
            // This account has a parent, update the parent's balance instead
            accountRepository.findById(account.getParentAccountId()).ifPresentOrElse(
                parentAccount -> updateBalance(parentAccount, balanceChange, visitedAccounts),
                () -> logger.warn("Parent account {} not found for account {}", 
                                account.getParentAccountId(), account.getId())
            );
        }
    }
}