package com.myfi.bankscraping.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AccountCredentials {
    @NotBlank(message = "Account name cannot be blank")
    private String accountName;

    @NotBlank(message = "Username cannot be blank")
    private String username;

    @NotBlank(message = "Password cannot be blank")
    private String password;

    @NotBlank(message = "Account number cannot be blank")
    private String accountNumber;
}