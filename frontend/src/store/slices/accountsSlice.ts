import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as apiService from '../../services/apiService';
import { Account } from '../../types';
import { RootState } from '../store'; // Import RootState

// Define the shape of the accounts state
interface AccountsState {
    accounts: Account[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

// Define the initial state
const initialState: AccountsState = {
    accounts: [],
    status: 'idle',
    error: null,
};

// Async thunk for fetching accounts
export const fetchAccounts = createAsyncThunk<
    Account[], // Return type
    void, // Argument type (none)
    { state: RootState, rejectValue: string } // Thunk config with RootState
>(
    'accounts/fetchAccounts',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiService.fetchAccounts();
            return response;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to fetch accounts';
            // Throw the rejected value
            throw rejectWithValue(message);
        }
    },
    {
        condition: (_, { getState }) => {
          const state = getState() as RootState;
          const { status } = state.accounts;
          // Prevent fetch if already loading or succeeded
          if (status === 'loading' || status === 'succeeded') {
            return false;
          }
          return true;
        },
    }
);

// Async thunk for creating an account
export const createAccount = createAsyncThunk<
    Account, // Return type: the newly created account
    Omit<Account, 'id' | 'createdAt' | 'updatedAt'>, // Argument type: data for new account
    { rejectValue: string } // Thunk config
>(
    'accounts/createAccount',
    async (accountData, { rejectWithValue }) => {
        try {
            // Use the imported apiService function
            const newAccount = await apiService.createAccount(accountData);
            return newAccount;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to create account';
            return rejectWithValue(message);
        }
    }
);

// Async thunk for deleting an account
export const deleteAccount = createAsyncThunk<
    string, // Return type: the ID of the deleted account for the reducer
    string, // Argument type: the ID of the account to delete
    { rejectValue: string } // Thunk config
>(
    'accounts/deleteAccount',
    async (accountId, { rejectWithValue }) => {
        try {
            // Use the imported apiService function
            await apiService.deleteAccount(accountId);
            return accountId; // Return the ID on success
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to delete account';
            return rejectWithValue(message);
        }
    }
);

// Create the accounts slice
const accountsSlice = createSlice({
    name: 'accounts',
    initialState,
    reducers: {
        // Add reducers for adding/updating/deleting accounts if needed
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAccounts.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchAccounts.fulfilled, (state, action: PayloadAction<Account[]>) => {
                state.status = 'succeeded';
                state.accounts = action.payload;
            })
            .addCase(fetchAccounts.rejected, (state, action) => {
                state.status = 'failed';
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Failed to fetch accounts';
            })
            // Create Account Cases
            .addCase(createAccount.pending, (state) => {
                // Optionally set a specific status like 'creating' or use 'loading'
                state.status = 'loading';
                state.error = null;
            })
            .addCase(createAccount.fulfilled, (state, action: PayloadAction<Account>) => {
                state.status = 'succeeded';
                state.accounts.push(action.payload); // Add the new account to the list
            })
            .addCase(createAccount.rejected, (state, action) => {
                state.status = 'failed';
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Failed to create account';
            })
            // Delete Account Cases
            .addCase(deleteAccount.pending, (state) => {
                // Optionally set a specific status like 'deleting' or use 'loading'
                state.status = 'loading';
                state.error = null;
            })
            .addCase(deleteAccount.fulfilled, (state, action: PayloadAction<string>) => {
                state.status = 'succeeded';
                // Filter out the deleted account using the returned ID
                state.accounts = state.accounts.filter(account => account.id.toString() !== action.payload);
            })
            .addCase(deleteAccount.rejected, (state, action) => {
                state.status = 'failed';
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Failed to delete account';
            });
    },
});

// Export the reducer
export default accountsSlice.reducer; 