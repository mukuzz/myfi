import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as apiService from '../../services/apiService';

// Define the shape of the state
interface SupportedAccountsState {
    /** 
     * Stores supported account types and their providers.
     * Example: { "SAVINGS": ["HDFC Bank", "ICICI Bank"], "CREDIT_CARD": ["Amex", "HDFC Bank"] }
     */
    types: Record<string, string[]> | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

// Define the initial state
const initialState: SupportedAccountsState = {
    types: null,
    status: 'idle',
    error: null,
};

// Async thunk for fetching supported account info
export const fetchSupportedAccounts = createAsyncThunk<
    Record<string, string[]>, // Return type
    void, // Argument type (none)
    { rejectValue: string } // Thunk config
>(
    'supportedAccounts/fetchSupportedAccounts',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiService.getSupportedAccountInfo();
            return response;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to fetch supported account types';
            return rejectWithValue(message);
        }
    }
);

// Create the slice
const supportedAccountsSlice = createSlice({
    name: 'supportedAccounts',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchSupportedAccounts.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchSupportedAccounts.fulfilled, (state, action: PayloadAction<Record<string, string[]>>) => {
                state.status = 'succeeded';
                state.types = action.payload;
            })
            .addCase(fetchSupportedAccounts.rejected, (state, action) => {
                state.status = 'failed';
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error';
            });
    },
});

// Export the reducer and thunk
export default supportedAccountsSlice.reducer; 