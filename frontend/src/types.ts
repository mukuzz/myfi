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
  isEmailScrapingSupported?: boolean;
  currency: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  accountNumber: string;
  children?: Account[] | null;
  ccStatementGenerationDay?: number | null;
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

// Represents com.myfi.refreshTracker.enums.RefreshJobStatus
export enum RefreshJobStatus {
    PENDING = "PENDING",
    INITIALIZING = "INITIALIZING",
    ACQUIRING_PERMIT = "ACQUIRING_PERMIT",
    LOGIN_STARTED = "LOGIN_STARTED",
    LOGIN_SUCCESS = "LOGIN_SUCCESS",
    LOGIN_FAILED = "LOGIN_FAILED",
    PROCESSING_STARTED = "PROCESSING_STARTED",
    BANK_PROCESSING_STARTED = "BANK_PROCESSING_STARTED",
    CC_PROCESSING_STARTED = "CC_PROCESSING_STARTED",
    PROCESSING_IN_PROGRESS = "PROCESSING_IN_PROGRESS",
    PROCESSING_SUCCESS = "PROCESSING_SUCCESS",
    PROCESSING_FAILED = "PROCESSING_FAILED",
    LOGOUT_STARTED = "LOGOUT_STARTED",
    LOGOUT_SUCCESS = "LOGOUT_SUCCESS",
    LOGOUT_FAILED = "LOGOUT_FAILED",
    COMPLETED = "COMPLETED",
    ERROR = "ERROR",
}

// Represents com.myfi.refreshTracker.dto.ProgressHistoryEntry
export interface ProgressHistoryEntryType {
    status: RefreshJobStatus;
    timestamp: string; // ISO DateTime string
    message: string | null;
}

// Represents com.myfi.refreshTracker.dto.OperationStatusDetail
export interface OperationStatusDetailType {
    accountNumber: string;
    accountName: string;
    status: RefreshJobStatus;
    startTime: string; // ISO DateTime string
    lastUpdateTime: string; // ISO DateTime string
    errorMessage: string | null;
    history: ProgressHistoryEntryType[];
    itemsProcessed?: number;
    itemsTotal?: number;
}

// Represents com.myfi.refreshTracker.dto.AggregatedRefreshStatusResponse
export interface AggregatedRefreshStatusResponseType {
    progressMap: { [key: string]: OperationStatusDetailType };
    refreshInProgress: boolean;
}

// --- Old types removed ---

export interface SystemStatus {
// ... existing SystemStatus interface ...
// Ensure this interface is still needed and correctly defined.
// If it was part of the old status system and not used elsewhere, it might also be removable.
// For now, I'll assume it's unrelated or you will manage it.
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