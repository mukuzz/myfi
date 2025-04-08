import React, { useState, useEffect, useMemo } from 'react';

// Define the Tab type if it's broadly used, or keep it local to where it's needed (e.g., App or BottomNav)
export type Tab = 'Home' | 'Transactions' | 'Accounts';

// Updated Transaction interface based on Java model
export interface Transaction {
  id: number; // Assuming Long maps to number in JSON
  amount: number; // Assuming BigDecimal maps to number
  description: string;
  type: 'CREDIT' | 'DEBIT';
  transactionDate: string; // Dates usually come as ISO strings
  tagId?: number; // Use tagId (optional if a transaction might not have a tag)
  accountId: number | null;
  counterParty?: string; // Added from backend model
  note?: string; // Add optional note field
  parentId?: number | null; // Optional parent ID for subtransactions
  subTransactions?: Transaction[]; // Optional list of subtransactions
  uniqueKey: string;
  notes?: string | null; // Add notes field
  excludeFromAccounting?: boolean; // Add excludeFromAccounting field
  // Add other fields if needed, e.g., createdAt, updatedAt
}

// Define the Tag type based on the Java model
export interface Tag {
  id: number;
  name: string;
  parentTagId?: number | null; // Optional parent ID
}

// Define the Account type based on the Java model
export interface Account {
  id: number;
  name: string;
  type: 'SAVINGS' | 'CREDIT_CARD' | 'LOAN' | 'STOCKS' | 'FIXED_DEPOSIT' | 'MUTUAL_FUND' | 'CRYPTO';
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  accountNumber: string;
  parentAccountId?: number | null; // Optional parent account ID
}

// Type for the scraping request payload
export interface ScrapeRequest {
  accountNumber: string;
  username: string;
  password: string;
  accountId: number; // To link back scraped data
  accountType: Account['type']; // May be useful for the scraper
  accountName: string; // Added account name
  // Add any other fields the scraper might need
} 