import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as apiService from '../../services/apiService';
import { Tag } from '../../types';

// Define the shape of the tags state
interface TagsState {
    tags: Tag[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

// Define the initial state
const initialState: TagsState = {
    tags: [],
    status: 'idle',
    error: null,
};

// Async thunk for fetching tags
export const fetchTags = createAsyncThunk<
    Tag[], // Return type
    void, // Argument type (none)
    { rejectValue: string } // Thunk config
>(
    'tags/fetchTags',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiService.fetchTags();
            return response;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to fetch tags';
            // Throw the rejected value for consistency with transaction slice
            throw rejectWithValue(message);
        }
    }
);

// Create the tags slice
const tagsSlice = createSlice({
    name: 'tags',
    initialState,
    reducers: {
        // Add reducers for adding/updating/deleting tags if needed
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTags.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchTags.fulfilled, (state, action: PayloadAction<Tag[]>) => {
                state.status = 'succeeded';
                state.tags = action.payload;
            })
            .addCase(fetchTags.rejected, (state, action) => {
                state.status = 'failed';
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error';
            });
    },
});

// Export the reducer
export default tagsSlice.reducer; 