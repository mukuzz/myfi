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
  tagId?: number | null; // Use tagId (optional if a transaction might not have a tag)
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
  accountId: number;
  accountType: string; // Or use AccountType enum if defined on frontend
  accountName: string;
  username: string;
  password?: string; // Password might be optional if already stored/handled securely
  accountNumber: string;
}

// Define scraping status enum based on backend
export enum ScrapingStatus {
    PENDING = 'PENDING',
    ACQUIRING_PERMIT = 'ACQUIRING_PERMIT',
    LOGIN_STARTED = 'LOGIN_STARTED',
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
    SCRAPING_STARTED = 'SCRAPING_STARTED',
    SCRAPING_BANK_STARTED = 'SCRAPING_BANK_STARTED',
    SCRAPING_CC_STARTED = 'SCRAPING_CC_STARTED',
    SCRAPING_SUCCESS = 'SCRAPING_SUCCESS',
    SCRAPING_FAILED = 'SCRAPING_FAILED',
    LOGOUT_STARTED = 'LOGOUT_STARTED',
    LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',
    LOGOUT_FAILED = 'LOGOUT_FAILED',
    COMPLETED = 'COMPLETED',
    ERROR = 'ERROR'
}

// Interface for a single event in the scraping history
// Matches backend ScrapingEvent
export interface ScrapingEvent {
    status: ScrapingStatus;
    timestamp: string; // ISO 8601 date string
    message?: string;
}

// Interface for individual account scraping progress
// Matches backend ScrapingProgress
export interface ScrapingProgress {
    accountNumber: string;
    accountName: string;
    status: ScrapingStatus;
    startTime: string; // ISO 8601 date string for start
    lastUpdateTime: string; // ISO 8601 date string for last update
    errorMessage?: string | null; // Optional error message
    history: ScrapingEvent[]; // History of events
}

// Interface for the overall status response
// Matches backend ScrapingStatusResponse
export interface ScrapingStatusResponse {
    progressMap: { [accountNumber: string]: ScrapingProgress };
    refreshInProgress: boolean;
}

export interface SystemStatus {
// ... existing SystemStatus interface ...
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