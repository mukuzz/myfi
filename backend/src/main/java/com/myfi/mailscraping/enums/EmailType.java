package com.myfi.mailscraping.enums;

public enum EmailType {
    TRANSACTION_INFORMATION("Transaction Information"),
    CREDIT_CARD_STATEMENT_INFORMATION("Credit Card Statement Information"),
    ACCOUNT_BALANCE_INFORMATION("Account Balance Information"),
    OTHER("Other");

    private final String displayName;

    EmailType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
} 