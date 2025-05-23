import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as apiService from '../../services/apiService';
import { Tag, TagMap } from '../../types';
import { RootState } from '../store'; // Import RootState

// Define the shape of the tags state
interface TagsState {
    tags: Tag[];
    tagMap: TagMap;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

// Define the initial state
const initialState: TagsState = {
    tags: [],
    tagMap: {},
    status: 'idle',
    error: null,
};

// Async thunk for fetching tags
export const fetchTags = createAsyncThunk<
    Tag[], // Return type
    void, // Argument type (none)
    { state: RootState, rejectValue: string } // Thunk config with RootState
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
    },
    {
        condition: (_, { getState }) => {
          const state = getState() as RootState;
          const { status } = state.tags;
          // Prevent fetch if already loading, succeeded, or failed
          if (status === 'loading' || status === 'succeeded' || status === 'failed') {
            return false;
          }
          return true;
        },
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
                // Calculate and store tagMap
                const map: TagMap = {};
                action.payload.forEach(tag => {
                  map[tag.id] = tag;
                });
                state.tagMap = map;
            })
            .addCase(fetchTags.rejected, (state, action) => {
                state.status = 'failed';
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error';
            });
    },
});

// Selector for tagMap
export const selectTagMap = (state: RootState) => state.tags.tagMap;

// Export the reducer
export default tagsSlice.reducer; 