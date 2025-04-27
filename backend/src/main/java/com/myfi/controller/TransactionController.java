package com.myfi.controller;

import com.myfi.model.Transaction;
import com.myfi.service.TransactionService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.math.BigDecimal;
import java.util.List;

@Data
class SplitRequest {
    private BigDecimal amount1;
    private BigDecimal amount2;
}

@Slf4j
@RestController
@RequestMapping("/api/v1/transactions")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST,  RequestMethod.PUT, RequestMethod.DELETE})
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public ResponseEntity<Page<Transaction>> getAllTransactions(
            @PageableDefault(size = 20, sort = "transactionDate,desc") Pageable pageable) {
        Page<Transaction> transactions = transactionService.getAllTransactions(pageable);
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/account/{accountId}")
    public ResponseEntity<Page<Transaction>> getTransactionsByAccountId(
            @PathVariable Long accountId,
            @PageableDefault(size = 20, sort = "transactionDate,desc") Pageable pageable) {
        Page<Transaction> transactions = transactionService.getTransactionsByAccountId(accountId, pageable);
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Transaction> getTransactionById(@PathVariable Long id) {
        return transactionService.getTransactionById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createTransaction(@RequestBody Transaction transaction) {
        try {
            Transaction createdTransaction = transactionService.createTransaction(transaction);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdTransaction);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("Error creating transaction", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An unexpected error occurred.");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTransaction(@PathVariable Long id, @RequestBody Transaction transactionDetails) {
        try {
            Transaction updatedTransaction = transactionService.updateTransaction(id, transactionDetails)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
            return ResponseEntity.ok(updatedTransaction);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (Exception e) {
            log.error("Error updating transaction {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An unexpected error occurred.");
        }
    }

    @PostMapping("/{parentId}/split")
    public ResponseEntity<?> splitTransaction(
            @PathVariable Long parentId,
            @RequestBody SplitRequest splitRequest) {
        try {
            if (splitRequest.getAmount1() == null || splitRequest.getAmount2() == null) {
                 return ResponseEntity.badRequest().body("Both amount1 and amount2 must be provided.");
            }

            Transaction updatedParent = transactionService.splitTransaction(parentId, splitRequest.getAmount1(), splitRequest.getAmount2());
            return ResponseEntity.ok(updatedParent);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (Exception e) {
            log.error("Error splitting transaction {}", parentId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred while splitting the transaction.");
        }
    }

    @PostMapping("/{childId}/merge")
    public ResponseEntity<?> mergeTransaction(@PathVariable Long childId) {
        try {
            Transaction updatedParent = transactionService.mergeTransaction(childId);
            return ResponseEntity.ok(updatedParent);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
        } catch (Exception e) {
            log.error("Error merging transaction {}", childId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred while merging the transaction.");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable Long id) {
        if (transactionService.deleteTransaction(id)) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/current-month")
    public ResponseEntity<List<Transaction>> getCurrentMonthTransactions() {
        List<Transaction> transactions = transactionService.getTransactionsForCurrentMonth();
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/month")
    public ResponseEntity<List<Transaction>> getTransactionsForMonth(
            @RequestParam int year,
            @RequestParam int month) {
        // Assuming month is 1-indexed (Jan=1, Feb=2, ...)
        try {
            List<Transaction> transactions = transactionService.getTransactionsForMonth(year, month);
            return ResponseEntity.ok(transactions);
        } catch (IllegalArgumentException e) {
            // Handle cases like invalid month/year range if needed in the service
            return ResponseEntity.badRequest().body(null); // Or return an error message
        } catch (Exception e) {
            log.error("Error fetching transactions for year={} month={}", year, month, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
} 