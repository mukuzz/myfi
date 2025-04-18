// Define the Tab type if it's broadly used, or keep it local to where it's needed (e.g., App or BottomNav)
export type Tab = 'Home' | 'Transactions';

// Updated Transaction interface based on Java model
export interface Transaction {
  id: number; // Assuming Long maps to number in JSON
  amount: number; // Assuming BigDecimal maps to number
  description: string;
  type: 'CREDIT' | 'DEBIT';
  transactionDate: string; // Dates usually come as ISO strings
  createdAt: string; // Added createdAt field
  updatedAt?: string; // Added updatedAt field
  tagId?: number; // Use tagId (optional if a transaction might not have a tag)
  account?: Account | null; // Replacing accountId with account object
  counterParty?: string; // Added from backend model
  parentId?: number | null; // Optional parent ID for subtransactions
  subTransactions?: Transaction[]; // Optional list of subtransactions
  uniqueKey?: string | null;
  notes?: string | null; // Add notes field
  excludeFromAccounting: boolean; // Changed from optional to required
  isManualEntry?: boolean; // Added manual entry flag
  // Add other fields if needed
}

// Define the Tag type based on the Java model
export interface Tag {
  id: number;
  name: string;
  parentTagId?: number | null; // Optional parent ID
}

// Type for the map of tag IDs to Tag objects
export type TagMap = { [id: number]: Tag };

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

// Generic Page type for paginated API responses
export interface Page<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
        sort: {
            sorted: boolean;
            unsorted: boolean;
            empty: boolean;
        };
        offset: number;
        paged: boolean;
        unpaged: boolean;
    };
    last: boolean;
    totalPages: number;
    totalElements: number;
    size: number;
    number: number; // Current page number (0-indexed)
    sort: {
        sorted: boolean;
        unsorted: boolean;
        empty: boolean;
    };
    first: boolean;
    numberOfElements: number;
    empty: boolean;
} 