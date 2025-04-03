package com.myfi.scraping.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BankCredentials {
    private String bankName;
    private String username;
    private String password;
    private String accountNumber;
}