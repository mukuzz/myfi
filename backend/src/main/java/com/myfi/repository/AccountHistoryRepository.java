package com.myfi.repository;

import com.myfi.model.Account;
import com.myfi.model.AccountHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountHistoryRepository extends JpaRepository<AccountHistory, Long> {

    /**
     * Finds the latest account history record for a given account.
     * @param account The account to find history for.
     * @return An Optional containing the latest AccountHistory record, or empty if none found.
     */
    Optional<AccountHistory> findTopByAccountOrderByRecordedAtDesc(Account account);

    /**
     * Finds all account history records for a given account, ordered by recorded date descending.
     * @param account The account to find history for.
     * @return A list of AccountHistory records.
     */
    List<AccountHistory> findByAccountOrderByRecordedAtDesc(Account account);
} 