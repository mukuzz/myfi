import { createSlice, createAsyncThunk, PayloadAction, AnyAction } from '@reduxjs/toolkit';
import * as apiService from '../../services/apiService';
import { Transaction, Page } from '../../types';
import { deleteAccount } from '../slices/accountsSlice'; // Import the action from accountsSlice
import { RootState } from '../store'; // Import RootState

// Helper function to sort transactions by date descending
const sortTransactionsByDateDesc = (a: Transaction, b: Transaction) =>
    new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();

// Define the shape of the transactions state
interface TransactionsState {
    // Keep track of transactions in a flat list for easier updates/infinite scroll
    transactions: Transaction[];
    transactionPage: Page<Transaction> | null;
    currentPage: number;
    hasMore: boolean;
    status: 'idle' | 'loading' | 'loadingMore' | 'succeeded' | 'failed';
    error: string | null;
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

// Define arguments for fetching transactions for a specific month
interface FetchTransactionsForMonthArgs {
    year: number;
    month: number; // Expecting 1-indexed month (Jan=1, Feb=2, ...)
}

// Define a type that includes the meta property for thunk actions
interface AsyncThunkAction<Payload, Arg> extends AnyAction {
    payload: Payload;
    meta: {
        arg: Arg;
        requestId: string;
        requestStatus: 'pending' | 'fulfilled' | 'rejected';
    };
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

// Async thunk for fetching transactions for a SPECIFIC month and year
export const fetchTransactionsForMonth = createAsyncThunk<
    Transaction[],
    FetchTransactionsForMonthArgs, // Use the new args interface
    { state: RootState, rejectValue: string }
>(
    'transactions/fetchTransactionsForMonth', // Rename the action type
    async ({ year, month }, { rejectWithValue }): Promise<Transaction[]> => {
        try {
            // Assume apiService has a function that takes year and month
            // Month is expected to be 1-indexed by the backend here
            const response = await apiService.fetchTransactionsForMonth(year, month);
            return response;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to fetch transactions for the selected month';
            throw rejectWithValue(message);
        }
    },
    {
        condition: ({ year, month }, { getState }) => {
          const state = getState() as RootState;
          // Use the main status field
          const { status } = state.transactions;
          // TODO: Potentially add logic to check if data for this specific year/month is already loaded
          // Prevent fetch if already loading
          if (status === 'loading' || status === 'loadingMore') {
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
                    // Append new transactions and then sort
                    state.transactions = [...state.transactions, ...pageData.content].sort(sortTransactionsByDateDesc);
                } else {
                    // Replace transactions and sort
                    state.transactions = [...pageData.content].sort(sortTransactionsByDateDesc);
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
            // --- Handlers for fetchTransactionsForMonth ---
            .addCase(fetchTransactionsForMonth.pending, (state) => {
                state.status = 'loading'; // Use main status field
                state.error = null; // Clear main error field
            })
            .addCase(fetchTransactionsForMonth.fulfilled, (state, action: PayloadAction<Transaction[]>) => {
                state.status = 'succeeded'; // Use main status field
                const fetchedTransactions = action.payload;
                
                // Cast action to include meta
                const thunkAction = action as AsyncThunkAction<Transaction[], FetchTransactionsForMonthArgs>;

                // Safely determine the year and month
                let year: number | undefined;
                let month: number | undefined; // 1-indexed
                
                if (thunkAction.meta?.arg) {
                    year = thunkAction.meta.arg.year;
                    month = thunkAction.meta.arg.month;
                } else if (fetchedTransactions.length > 0) {
                    // Fallback: Infer from the first transaction if meta is unavailable
                    const firstTxDate = new Date(fetchedTransactions[0].transactionDate);
                    year = firstTxDate.getFullYear();
                    month = firstTxDate.getMonth() + 1; // Adjust 0-indexed month
                }

                // Proceed only if year and month could be determined
                if (year !== undefined && month !== undefined) {
                    // Filter out existing transactions for the fetched month/year
                    state.transactions = state.transactions.filter(tx => {
                        const txDate = new Date(tx.transactionDate);
                        const txYear = txDate.getFullYear();
                        const txMonth = txDate.getMonth() + 1; // getMonth is 0-indexed, adjust to 1-indexed
                        return !(txYear === year && txMonth === month);
                    });

                    // Add the newly fetched transactions
                    state.transactions.push(...fetchedTransactions);
                    // Sort transactions by date descending after update
                    state.transactions.sort(sortTransactionsByDateDesc);
                } else {
                    // Handle the case where year/month couldn't be determined (e.g., empty payload and no meta.arg)
                    console.warn('Could not determine year/month for fetched transactions. State not updated.');
                    // Optionally set an error state here
                }
            })
            .addCase(fetchTransactionsForMonth.rejected, (state, action) => {
                state.status = 'failed'; // Use main status field
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error fetching selected month transactions'; // Use main error field
            })
            // --- Handlers for createTransaction ---
            .addCase(createTransaction.pending, (state) => {
                state.mutationStatus = 'loading';
                state.mutationError = null;
            })
            .addCase(createTransaction.fulfilled, (state, action: PayloadAction<Transaction>) => {
                state.mutationStatus = 'succeeded';
                state.transactions.unshift(action.payload);
                state.transactions.sort(sortTransactionsByDateDesc); // Sort after adding
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
                state.transactions.sort(sortTransactionsByDateDesc); // Sort after update
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
                state.transactions.sort(sortTransactionsByDateDesc); // Sort after update
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

                // Update both main and selected month lists
                state.transactions = updateListWithSplit(state.transactions);
                state.transactions.sort(sortTransactionsByDateDesc); // Sort after split

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

                state.transactions.sort(sortTransactionsByDateDesc); // Sort after merge

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
                // Remove from main list (sorting isn't strictly necessary after removal, but doesn't hurt)
                state.transactions = state.transactions.filter(t => t.id !== deletedId).sort(sortTransactionsByDateDesc);
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
                ).sort(sortTransactionsByDateDesc); // Sort after removal
                // Adjust total elements if page data exists
                if (state.transactionPage) {
                    // This count adjustment might be slightly off if sub-transactions were counted before.
                    // Recalculating count based on the filtered list length might be more robust.
                    // state.transactionPage.totalElements = state.transactions.filter(tx => !tx.parentId).length; // Example: Count only parents
                     state.transactionPage.totalElements = state.transactions.length; // Or simply update with current length if total includes sub-tx
                }
            });
    },
});

// Export the reducer and actions
export const { resetMutationStatus } = transactionsSlice.actions;
export default transactionsSlice.reducer;

// Export actions if you add any regular reducers
// export const { ... } = transactionsSlice.actions; 