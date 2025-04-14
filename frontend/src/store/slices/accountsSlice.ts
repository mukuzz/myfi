import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as apiService from '../../services/apiService';
import { Account } from '../../types';

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
    { rejectValue: string } // Thunk config
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
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error';
            });
    },
});

// Export the reducer
export default accountsSlice.reducer; 