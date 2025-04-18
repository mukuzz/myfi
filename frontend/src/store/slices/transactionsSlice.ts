import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as apiService from '../../services/apiService';
import { Transaction, Page, Tag } from '../../types';
import { deleteAccount } from '../slices/accountsSlice'; // Import the action from accountsSlice
import { RootState } from '../store'; // Import RootState

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
    // Update payload to accept optional accountId (null for CASH) and isManualEntry
    transactionData: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>;
}

interface UpdateTransactionArgs {
    transactionId: number;
    updatedData: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>;
}

interface UpdateTransactionTagArgs {
    transactionId: number;
    newTagId: number | null;
    // Include original transaction data needed by apiService.updateTransactionTagApi
    // We need the original transaction to pass other fields besides tagId
    originalTransaction: Omit<Transaction, 'id' | 'tagId'>;
}

interface SplitTransactionArgs {
    transactionId: number;
    amount1: number;
    amount2: number;
}

interface DeleteTransactionArgs {
    transactionId: number;
}

// Async thunk for fetching ALL transactions
export const fetchTransactions = createAsyncThunk<
    Page<Transaction>,
    FetchTransactionsArgs | void,
    { state: RootState, rejectValue: string }
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
    },
    {
        condition: (args, { getState }) => {
            const state = getState() as RootState;
            const { status } = state.transactions;
            const isFetchingFirstPage = !args || args.page === undefined || args.page === 0;
            // Prevent fetch if already loading/loadingMore or succeeded (for first page)
            if (status === 'loading' || status === 'loadingMore' || (isFetchingFirstPage && status === 'succeeded')) {
                return false;
            }
            return true;
        },
    }
);

// Async thunk for fetching CURRENT MONTH transactions
export const fetchCurrentMonthTransactions = createAsyncThunk<
    Transaction[],
    void,
    { state: RootState, rejectValue: string }
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
    },
    {
        condition: (_, { getState }) => {
          const state = getState() as RootState;
          const { currentMonthStatus } = state.transactions;
          // Prevent fetch if already loading or succeeded
          if (currentMonthStatus === 'loading' || currentMonthStatus === 'succeeded') {
            return false;
          }
          return true;
        },
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
            // Convert null to -1 for the tagId property to signal untagging
            const updatedFields = { 
                ...originalTransaction, 
                tagId: newTagId === null ? -1 : newTagId 
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

// Update Transaction (General)
export const updateTransactionAsync = createAsyncThunk<
    Transaction, // Return the updated transaction
    UpdateTransactionArgs,
    { rejectValue: string }
>(
    'transactions/updateTransactionAsync',
    async ({ transactionId, updatedData }, { rejectWithValue }) => {
        try {
            const response = await apiService.updateTransaction(transactionId, updatedData);
            return response;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to update transaction';
            throw rejectWithValue(message);
        }
    }
);

// Split Transaction
export const splitTransaction = createAsyncThunk<
    Transaction, // Returns the updated parent transaction (API should return this)
    SplitTransactionArgs,
    { rejectValue: string }
>(
    'transactions/splitTransaction',
    async ({ transactionId, amount1, amount2 }, { rejectWithValue }) => {
        try {
            const response = await apiService.splitTransactionApi(transactionId, amount1, amount2);
            return response; // Assuming API returns the updated parent transaction with subTransactions
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to split transaction';
            throw rejectWithValue(message);
        }
    }
);

// Merge Transaction
export const mergeTransaction = createAsyncThunk<
    Transaction, // Returns the updated parent transaction
    number,      // Accepts the child transaction ID
    { rejectValue: string }
>(
    'transactions/mergeTransaction',
    async (childId, { rejectWithValue }) => {
        try {
            const updatedParent = await apiService.mergeTransactionApi(childId);
            return updatedParent;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to merge transaction';
            throw rejectWithValue(message);
        }
    }
);

// Delete Transaction
export const deleteTransactionAsync = createAsyncThunk<
    number, // Return the ID of the deleted transaction
    DeleteTransactionArgs,
    { rejectValue: string }
>(
    'transactions/deleteTransactionAsync',
    async ({ transactionId }, { rejectWithValue }) => {
        try {
            await apiService.deleteTransaction(transactionId);
            return transactionId; // Return the ID on success
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to delete transaction';
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
                // Add the new transaction to currentMonthTransactions if it belongs to the current month
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                const txDate = new Date(action.payload.transactionDate);
                const txMonth = txDate.getMonth();
                const txYear = txDate.getFullYear();
                
                if (txMonth === currentMonth && txYear === currentYear) {
                    state.currentMonthTransactions.unshift(action.payload);
                }
                if (state.transactionPage) {
                    state.transactionPage.totalElements += 1;
                }
            })
            .addCase(createTransaction.rejected, (state, action) => {
                state.mutationStatus = 'failed';
                state.mutationError = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error creating transaction';
            })
            // --- Handlers for updateTransactionTag ---
            .addCase(updateTransactionTag.pending, (state) => {
                state.mutationStatus = 'loading';
                state.mutationError = null;
            })
            .addCase(updateTransactionTag.fulfilled, (state, action: PayloadAction<Transaction>) => {
                state.mutationStatus = 'succeeded';
                const updatedTx = action.payload;

                // Helper function to update a transaction within a list (top-level or sub-transaction)
                const updateTransactionInList = (list: Transaction[]) => {
                    // Check if it's a sub-transaction by looking for parentId
                    if (updatedTx.parentId) {
                        // It's a sub-transaction, find the parent and update the sub-transaction within it
                        const parentIndex = list.findIndex(tx => tx.id === updatedTx.parentId);
                        if (parentIndex !== -1 && list[parentIndex].subTransactions) {
                            const subIndex = list[parentIndex].subTransactions!.findIndex(subTx => subTx.id === updatedTx.id);
                            if (subIndex !== -1) {
                                list[parentIndex].subTransactions![subIndex] = updatedTx;
                            }
                        }
                    } 
                    // Update the top-level transaction as well
                    const index = list.findIndex(tx => tx.id === updatedTx.id);
                    if (index !== -1) {
                        list[index] = updatedTx;
                    }
                };

                // Update in the main transactions list
                updateTransactionInList(state.transactions);

                // Update in the current month transactions list
                updateTransactionInList(state.currentMonthTransactions);
            })
            .addCase(updateTransactionTag.rejected, (state, action) => {
                state.mutationStatus = 'failed';
                state.mutationError = action.payload || 'Failed to update tag';
            })
            // --- Handlers for updateTransactionAsync ---
            .addCase(updateTransactionAsync.pending, (state) => {
                state.mutationStatus = 'loading';
                state.mutationError = null;
            })
            .addCase(updateTransactionAsync.fulfilled, (state, action: PayloadAction<Transaction>) => {
                state.mutationStatus = 'succeeded';
                const updatedTx = action.payload;

                // Reusing the same helper function logic as in updateTransactionTag
                const updateTransactionInList = (list: Transaction[]) => {
                    if (updatedTx.parentId) {
                        // It's a sub-transaction
                        const parentIndex = list.findIndex(tx => tx.id === updatedTx.parentId);
                        if (parentIndex !== -1 && list[parentIndex].subTransactions) {
                            const subIndex = list[parentIndex].subTransactions!.findIndex(subTx => subTx.id === updatedTx.id);
                            if (subIndex !== -1) {
                                list[parentIndex].subTransactions![subIndex] = updatedTx;
                            }
                        }
                    } 
                    
                    // Update the top-level transaction as well
                    const index = list.findIndex(tx => tx.id === updatedTx.id);
                    if (index !== -1) {
                        list[index] = updatedTx;
                    }
                    
                };

                updateTransactionInList(state.transactions);
                updateTransactionInList(state.currentMonthTransactions);
            })
            .addCase(updateTransactionAsync.rejected, (state, action) => {
                state.mutationStatus = 'failed';
                state.mutationError = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Failed to update transaction';
            })
            // --- Handlers for splitTransaction ---
            .addCase(splitTransaction.pending, (state) => {
                state.mutationStatus = 'loading';
                state.mutationError = null;
            })
            .addCase(splitTransaction.fulfilled, (state, action) => {
                // Action payload is the updated parent transaction
                const updatedParent = action.payload;

                // Helper function to update transactions list
                const updateListWithSplit = (list: Transaction[]) => {
                    const parentIndex = list.findIndex(tx => tx.id === updatedParent.id);
                    if (parentIndex !== -1) {
                        // Replace the parent transaction
                        list[parentIndex] = updatedParent;
                        // Add sub-transactions right after the parent if they exist
                        if (updatedParent.subTransactions && updatedParent.subTransactions.length > 0) {
                            list.splice(parentIndex + 1, 0, ...updatedParent.subTransactions);
                        }
                    } else {
                        // Handle case where parent wasn't in the list (should not happen ideally)
                        // Add parent and then sub-transactions
                        list.push(updatedParent);
                        if (updatedParent.subTransactions && updatedParent.subTransactions.length > 0) {
                            list.push(...updatedParent.subTransactions);
                        }
                    }
                    return list; // Return the modified list
                };

                // Update both main and current month lists
                state.transactions = updateListWithSplit(state.transactions);
                state.currentMonthTransactions = updateListWithSplit(state.currentMonthTransactions);

                state.mutationStatus = 'succeeded';
                state.mutationError = null;
            })
            .addCase(splitTransaction.rejected, (state, action) => {
                state.mutationStatus = 'failed';
                state.mutationError = action.payload || 'Failed to split transaction';
            })
            // --- Handlers for mergeTransaction ---
            .addCase(mergeTransaction.pending, (state) => {
                state.mutationStatus = 'loading';
                state.mutationError = null;
            })
            .addCase(mergeTransaction.fulfilled, (state, action) => {
                // action.payload is the updated parent transaction
                // action.meta.arg is the childId that was merged
                const updatedParent = action.payload;
                const mergedChildId = action.meta.arg;

                // Remove the merged child from the main list
                state.transactions = state.transactions.filter(tx => tx.id !== mergedChildId);

                // Find and update the parent in the main list
                const parentIndex = state.transactions.findIndex(tx => tx.id === updatedParent.id);
                if (parentIndex !== -1) {
                    state.transactions[parentIndex] = updatedParent;
                } else {
                    // This case is unlikely if the parent existed before the merge
                    console.warn('Parent transaction not found in state after merge for ID:', updatedParent.id);
                    // Optionally add it back if necessary
                    state.transactions.push(updatedParent);
                }

                // Remove child and update parent in current month list as well
                state.currentMonthTransactions = state.currentMonthTransactions.filter(tx => tx.id !== mergedChildId);
                const monthParentIndex = state.currentMonthTransactions.findIndex(tx => tx.id === updatedParent.id);
                if (monthParentIndex !== -1) {
                    state.currentMonthTransactions[monthParentIndex] = updatedParent;
                }

                state.mutationStatus = 'succeeded';
                state.mutationError = null;
            })
            .addCase(mergeTransaction.rejected, (state, action) => {
                state.mutationStatus = 'failed';
                state.mutationError = action.payload || 'Failed to merge transaction';
            })
            // --- Handlers for deleteTransactionAsync ---
            .addCase(deleteTransactionAsync.pending, (state) => {
                state.mutationStatus = 'loading';
                state.mutationError = null;
            })
            .addCase(deleteTransactionAsync.fulfilled, (state, action: PayloadAction<number>) => {
                state.mutationStatus = 'succeeded';
                const deletedId = action.payload;
                // Remove from both lists
                state.transactions = state.transactions.filter(t => t.id !== deletedId);
                state.currentMonthTransactions = state.currentMonthTransactions.filter(t => t.id !== deletedId);
                // Adjust total elements if page data exists
                if (state.transactionPage) {
                    state.transactionPage.totalElements -= 1;
                }
            })
            .addCase(deleteTransactionAsync.rejected, (state, action) => {
                state.mutationStatus = 'failed';
                state.mutationError = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error deleting transaction';
            })
            // --- Handler for when an account is deleted ---
            .addCase(deleteAccount.fulfilled, (state, action: PayloadAction<string>) => {
                const deletedAccountId = action.payload; // ID of the deleted account (string)
                // Remove transactions associated with the deleted account
                state.transactions = state.transactions.filter(
                    (tx) => tx.account?.id.toString() !== deletedAccountId
                );
                // Also update current month transactions if they exist
                state.currentMonthTransactions = state.currentMonthTransactions.filter(
                    (tx) => tx.account?.id.toString() !== deletedAccountId
                );
                // Optional: Update pagination info if necessary, though removing from the main list might be sufficient
                // Recalculating totalElements could be complex here
            });
    },
});

// Export the reducer and actions
export const { resetMutationStatus } = transactionsSlice.actions;
export default transactionsSlice.reducer;

// Export actions if you add any regular reducers
// export const { ... } = transactionsSlice.actions; 