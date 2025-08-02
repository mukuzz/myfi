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
          // Prevent fetch if already loading
          if (status === 'loading') {
            return false;
          }
          return true;
        },
    }
);


// Async thunk for creating a new tag
export const createTag = createAsyncThunk<
    Tag, // Return type
    Omit<Tag, 'id'>, // Argument type
    { state: RootState, rejectValue: string } // Thunk config
>(
    'tags/createTag',
    async (tagData, { rejectWithValue }) => {
        try {
            const response = await apiService.createTag(tagData);
            return response;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to create tag';
            throw rejectWithValue(message);
        }
    }
);

// Async thunk for updating a tag
export const updateTag = createAsyncThunk<
    Tag, // Return type
    { id: number; tagData: Partial<Omit<Tag, 'id'>> }, // Argument type
    { state: RootState, rejectValue: string } // Thunk config
>(
    'tags/updateTag',
    async ({ id, tagData }, { rejectWithValue }) => {
        try {
            const response = await apiService.updateTag(id, tagData);
            return response;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to update tag';
            throw rejectWithValue(message);
        }
    }
);

// Async thunk for deleting a tag
export const deleteTag = createAsyncThunk<
    number, // Return type (deleted tag ID)
    number, // Argument type (tag ID)
    { state: RootState, rejectValue: string } // Thunk config
>(
    'tags/deleteTag',
    async (tagId, { rejectWithValue }) => {
        try {
            await apiService.deleteTag(tagId);
            return tagId;
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to delete tag';
            throw rejectWithValue(message);
        }
    }
);

// Async thunk for reordering tags
export const reorderTags = createAsyncThunk<
    apiService.TagOrderUpdate[], // Return type (the updates that were applied)
    apiService.TagOrderUpdate[], // Argument type
    { state: RootState, rejectValue: string } // Thunk config
>(
    'tags/reorderTags',
    async (updates, { rejectWithValue }) => {
        try {
            await apiService.reorderTags(updates);
            return updates; // Return the updates so we can apply them locally
        } catch (error: any) {
            const message = error instanceof Error ? error.message : 'Failed to reorder tags';
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
            })
            // Create tag cases
            .addCase(createTag.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(createTag.fulfilled, (state, action: PayloadAction<Tag>) => {
                state.status = 'succeeded';
                state.tags.push(action.payload);
                // Update tagMap
                state.tagMap[action.payload.id] = action.payload;
            })
            .addCase(createTag.rejected, (state, action) => {
                state.status = 'failed';
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error';
            })
            // Update tag cases
            .addCase(updateTag.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(updateTag.fulfilled, (state, action: PayloadAction<Tag>) => {
                state.status = 'succeeded';
                const index = state.tags.findIndex(tag => tag.id === action.payload.id);
                if (index !== -1) {
                    state.tags[index] = action.payload;
                }
                // Update tagMap
                state.tagMap[action.payload.id] = action.payload;
            })
            .addCase(updateTag.rejected, (state, action) => {
                state.status = 'failed';
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error';
            })
            // Delete tag cases
            .addCase(deleteTag.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(deleteTag.fulfilled, (state, action: PayloadAction<number>) => {
                state.status = 'succeeded';
                state.tags = state.tags.filter(tag => tag.id !== action.payload);
                // Remove from tagMap
                delete state.tagMap[action.payload];
            })
            .addCase(deleteTag.rejected, (state, action) => {
                state.status = 'failed';
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error';
            })
            // Reorder tags cases
            .addCase(reorderTags.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(reorderTags.fulfilled, (state, action: PayloadAction<apiService.TagOrderUpdate[]>) => {
                state.status = 'succeeded';
                // Apply the order updates to the local state
                action.payload.forEach(update => {
                    const tag = state.tags.find(t => t.id === update.tagId);
                    if (tag) {
                        tag.orderIndex = update.newOrderIndex;
                    }
                    // Also update tagMap
                    if (state.tagMap[update.tagId]) {
                        state.tagMap[update.tagId].orderIndex = update.newOrderIndex;
                    }
                });
            })
            .addCase(reorderTags.rejected, (state, action) => {
                state.status = 'failed';
                state.error = typeof action.payload === 'string' ? action.payload : action.error.message ?? 'Unknown error';
            });
    },
});

// Selector for tagMap
export const selectTagMap = (state: RootState) => state.tags.tagMap;

// Export the reducer
export default tagsSlice.reducer; 