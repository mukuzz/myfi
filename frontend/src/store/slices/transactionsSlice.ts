import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as apiService from '../../services/apiService';
import { Transaction, Page } from '../../types';

// Define the shape of the transactions state
interface TransactionsState {
    // Keep track of transactions in a flat list for easier updates/infinite scroll
    transactions: Transaction[];
    transactionPage: Page<Transaction> | null;
    currentPage: number;
    hasMore: boolean;
    status: 'idle' | 'loading' | 'loadingMore' | 'succeeded' | 'failed';
    error: string | null;
    currentMonthTransactions: Transaction[]; // Keep this for SpendingSummary specific data
    currentMonthStatus: 'idle' | 'loading' | 'succeeded' | 'failed'; // Separate status for monthly fetch
    currentMonthError: string | null;
    mutationStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    mutationError: string | null;
}

// Define the initial state
const initialState: TransactionsState = {
    transactions: [],
    transactionPage: null,
    currentPage: 0,
    hasMore: true,
    status: 'idle',
    error: null,
    currentMonthTransactions: [],
    currentMonthStatus: 'idle',
    currentMonthError: null,
    mutationStatus: 'idle',
    mutationError: null,
};

// Define arguments for fetchTransactions thunk
interface FetchTransactionsArgs {
    page?: number;
    size?: number;
    // Add other filter/sort arguments here if needed
}

interface CreateTransactionArgs {
    // Define the necessary payload, excluding fields generated by backend (id, createdAt, etc.)
    // Use Partial<Omit<...>> to match apiService signature
    transactionData: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'account' | 'subTransactions'> & { accountId: number }>; // Require accountId
}

interface UpdateTransactionTagArgs {
    transactionId: number;
    newTagId: number | null;
    // Include original transaction data needed by apiService.updateTransactionTagApi
    // We need the original transaction to pass other fields besides tagId
    originalTransaction: Omit<Transaction, 'id' | 'tagId'>;
}

// Async thunk for fetching ALL transactions
export const fetchTransactions = createAsyncThunk<
    Page<Transaction>,
    FetchTransactionsArgs | void,
    { rejectValue: string }
>(
    'transactions/fetchTransactions',
    async (args, { rejectWithValue }): Promise<Page<Transaction>> => {
        try {
            const page = args?.page ?? 0;
            const size = args?.size ?? 20;
            const response = await apiService.fetchTransactions(page, size);
            return response;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
            throw rejectWithValue(message);
        }
    }
);

// Async thunk for fetching CURRENT MONTH transactions
export const fetchCurrentMonthTransactions = createAsyncThunk<
    Transaction[],
    void,
    { rejectValue: string }
>(
    'transactions/fetchCurrentMonthTransactions',
    async (_, { rejectWithValue }): Promise<Transaction[]> => {
        try {
            const response = await apiService.fetchCurrentMonthTransactions();
            return response;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to fetch current month transactions';
            throw rejectWithValue(message);
        }
    }
);

// Create Transaction
export const createTransaction = createAsyncThunk<
    Transaction, // Returns the created transaction
    CreateTransactionArgs,
    { rejectValue: string }
>(
    'transactions/createTransaction',
    async ({ transactionData }, { rejectWithValue }) => {
        try {
            const response = await apiService.createTransaction(transactionData);
            return response;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to create transaction';
            throw rejectWithValue(message);
        }
    }
);

// Update Transaction Tag
export const updateTransactionTag = createAsyncThunk<
    Transaction, // Return the updated transaction (or void if API doesn't return it)
    UpdateTransactionTagArgs,
    { rejectValue: string, state: { transactions: TransactionsState } } // Access state type
>(
    'transactions/updateTransactionTag',
    async ({ transactionId, newTagId, originalTransaction }, { rejectWithValue, getState }) => {
        try {
            // Option 1: Use dedicated API endpoint if it exists and only needs tagId
            // await apiService.updateTransactionTagApi(transactionId, newTagId);
            // Option 2: Use general update endpoint, sending the tagId
            // Convert null to undefined for the tagId property
            const updatedFields = { 
                ...originalTransaction, 
                tagId: newTagId === null ? undefined : newTagId 
            };
            const response = await apiService.updateTransaction(transactionId, updatedFields);
            // Assuming updateTransaction returns the updated transaction
            return response;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to update tag';
            throw rejectWithValue(message);
        }
    }
);

// Create the transactions slice
const transactionsSlice = createSlice({
    name: 'transactions',
    initialState,
    reducers: {
        resetMutationStatus: (state) => {
            state.mutationStatus = 'idle';
            state.mutationError = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // --- Handlers for fetchTransactions ---
            .addCase(fetchTransactions.pending, (state, action) => {
                if (action.meta.arg?.page && action.meta.arg.page > 0) {
                    state.status = 'loadingMore';
                } else {
                    state.status = 'loading';
                }
                state.error = null;
            })
            .addCase(fetchTransactions.fulfilled, (state, action: PayloadAction<Page<Transaction>>) => {
                const pageData = action.payload;
                if (pageData.number > 0) {
                    state.transactions = [...state.transactions, ...pageData.content];
                } else {
                    state.transactions = pageData.content;
                }
                state.transactionPage = pageData;
                state.currentPage = pageData.number;
                state.hasMore = !pageData.last;
                state.status = 'succeeded';
            })
            .addCase(fetchTransactions.rejected, (state, action) => {
                state.status = 'failed';
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error fetching transactions';
            })
            // --- Handlers for fetchCurrentMonthTransactions ---
            .addCase(fetchCurrentMonthTransactions.pending, (state) => {
                state.currentMonthStatus = 'loading';
                state.currentMonthError = null;
            })
            .addCase(fetchCurrentMonthTransactions.fulfilled, (state, action: PayloadAction<Transaction[]>) => {
                state.currentMonthStatus = 'succeeded';
                state.currentMonthTransactions = action.payload;
            })
            .addCase(fetchCurrentMonthTransactions.rejected, (state, action) => {
                state.currentMonthStatus = 'failed';
                state.currentMonthError = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error fetching monthly transactions';
            })
            // --- Handlers for createTransaction ---
            .addCase(createTransaction.pending, (state) => {
                state.mutationStatus = 'loading';
                state.mutationError = null;
            })
            .addCase(createTransaction.fulfilled, (state, action: PayloadAction<Transaction>) => {
                state.mutationStatus = 'succeeded';
                state.transactions.unshift(action.payload);
                if (state.transactionPage) {
                    state.transactionPage.totalElements += 1;
                }
            })
            .addCase(createTransaction.rejected, (state, action) => {
                state.mutationStatus = 'failed';
                state.mutationError = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Failed to create transaction';
            })
            // --- Handlers for updateTransactionTag ---
            .addCase(updateTransactionTag.pending, (state) => {
                state.mutationStatus = 'loading';
                state.mutationError = null;
            })
            .addCase(updateTransactionTag.fulfilled, (state, action: PayloadAction<Transaction>) => {
                state.mutationStatus = 'succeeded';
                const index = state.transactions.findIndex(tx => tx.id === action.payload.id);
                if (index !== -1) {
                    state.transactions[index] = action.payload;
                }
                const monthIndex = state.currentMonthTransactions.findIndex(tx => tx.id === action.payload.id);
                if (monthIndex !== -1) {
                    state.currentMonthTransactions[monthIndex] = action.payload;
                }
            })
            .addCase(updateTransactionTag.rejected, (state, action) => {
                state.mutationStatus = 'failed';
                state.mutationError = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Failed to update tag';
            });
    },
});

// Export the reducer and actions
export const { resetMutationStatus } = transactionsSlice.actions;
export default transactionsSlice.reducer;

// Export actions if you add any regular reducers
// export const { ... } = transactionsSlice.actions; 