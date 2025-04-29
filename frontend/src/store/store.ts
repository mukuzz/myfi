import { configureStore } from '@reduxjs/toolkit';
import { enableMapSet } from 'immer'; // Import the plugin

// Import slice reducers
import transactionsReducer from './slices/transactionsSlice';
import tagsReducer from './slices/tagsSlice';
import accountsReducer from './slices/accountsSlice';
import supportedAccountsReducer from './slices/supportedAccountsSlice';

// Enable Immer plugin for Map and Set
enableMapSet();

export const store = configureStore({
  reducer: {
    // Add reducers to the store
    transactions: transactionsReducer,
    tags: tagsReducer,
    accounts: accountsReducer,
    supportedAccounts: supportedAccountsReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {transactions: TransactionsState, tags: TagsState, accounts: AccountsState}
export type AppDispatch = typeof store.dispatch; 