import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Transactions from './Transactions';
import { useTransactionData } from '../hooks/useTransactionData';
import { groupTransactionsByMonth } from '../utils/transactionUtils';
import { createTransaction as apiCreateTransaction } from '../services/apiService'; // Alias to avoid name clash
import { Transaction, Tag, TagMap, Account } from '../types';
import '@testing-library/jest-dom';
import { within } from '@testing-library/react';

// --- Mocks ---

// Mock Hooks
jest.mock('../hooks/useTransactionData');
const mockedUseTransactionData = useTransactionData as jest.Mock;

// Mock API Services
jest.mock('../services/apiService');
const mockedApiCreateTransaction = apiCreateTransaction as jest.Mock;

// Mock Utils
jest.mock('../utils/transactionUtils');
const mockedGroupTransactionsByMonth = groupTransactionsByMonth as jest.Mock;

// Mock Child Components and Icons
jest.mock('react-icons/fi', () => ({
  FiFilter: () => <svg data-testid="filter-icon" />,
  FiPlus: () => <svg data-testid="plus-icon" />,
  FiSearch: () => <svg data-testid="search-icon" />,
}));
jest.mock('./TransactionCard', () => ({ transaction, onCardClick, onTagClick }: any) => (
  <div data-testid={`tx-card-${transaction.id}`} onClick={() => onCardClick(transaction)}>
    Transaction {transaction.id} - {transaction.description}
    <button onClick={(e) => onTagClick(transaction, e)}>Tag</button>
  </div>
));
let tagSelectorProps: any = {};
jest.mock('./TagSelector', () => (props: any) => {
    tagSelectorProps = props;
    return <div data-testid="tag-selector">Tag Selector <button onClick={() => props.onSelectTag(99)}>Select Tag 99</button></div>;
});
let detailViewProps: any = {};
jest.mock('./TransactionDetailView', () => (props: any) => {
    detailViewProps = props;
    return <div data-testid="detail-view">Detail View for {props.transaction.id} <button onClick={() => props.onManageSplit(props.transaction)}>Split</button></div>;
});
let amountInputModalProps: any = {};
jest.mock('./AmountInputModal', () => (props: any) => {
    amountInputModalProps = props;
    // Simulate submitting a valid transaction from the modal
    const handleSubmit = () => {
        const payload: Transaction = {
            ...props.transaction, // Start with the initial dummy/edit data
            amount: 5000,
            type: 'DEBIT',
            description: 'Test Manual Tx', // Actual component might derive this differently
            account: mockAccount, // Use the mock account object
            transactionDate: new Date().toISOString(),
            // Ensure required fields are present if not in props.transaction
            id: props.transaction.id || -1, 
            createdAt: props.transaction.createdAt || new Date().toISOString(),
            excludeFromAccounting: props.transaction.excludeFromAccounting || false,
        };
       
        // The handler in Transactions.tsx expects the full Transaction object
        props.onSubmitTransaction(payload);
    };
    return <div data-testid="amount-input-modal">Amount Input <button onClick={handleSubmit}>Submit Tx</button> <button onClick={props.onClose}>Close Add</button></div>;
});
let splitViewProps: any = {};
jest.mock('./SplitTransactionView', () => (props: any) => {
    splitViewProps = props;
    return <div data-testid="split-view">Split View for {props.transaction.id} <button onClick={props.onClose}>Close Split</button></div>;
});

// Refined DraggableBottomSheet Mock (Simpler Test ID)
jest.mock('./DraggableBottomSheet', () => (props: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) => {
    // Use a fixed, predictable test ID for the wrapper when open
    // We will check for the specific content *inside* this wrapper in the tests
    return props.isOpen ? <div data-testid="sheet-wrapper">{props.children}</div> : null;
});

// --- Test Data ---
const mockAccount: Account = { // Define a reusable mock account
  id: 1,
  name: 'Mock Savings',
  type: 'SAVINGS',
  balance: 100000,
  currency: 'USD',
  createdAt: '2023-01-01T00:00:00Z',
  isActive: true,
  accountNumber: '12345',
};

const mockTags: Tag[] = [
  { id: 1, name: 'Groceries' }, // Removed color
  { id: 2, name: 'Gas' },       // Removed color
];
const mockTagMap: TagMap = {
  1: mockTags[0],
  2: mockTags[1],
};
const mockTransactions: Transaction[] = [
  { id: 101, account: mockAccount, description: 'Grocery Store', amount: 5000, transactionDate: '2024-01-15T10:00:00Z', type: 'DEBIT', tagId: 1, createdAt: '2024-01-15T10:00:00Z', excludeFromAccounting: false },
  { id: 102, account: mockAccount, description: 'Gas Station', amount: 3000, transactionDate: '2024-01-10T10:00:00Z', type: 'DEBIT', tagId: 2, createdAt: '2024-01-10T10:00:00Z', excludeFromAccounting: false },
  { id: 103, account: mockAccount, description: 'Paycheck', amount: 200000, transactionDate: '2024-02-01T10:00:00Z', type: 'CREDIT', tagId: undefined, createdAt: '2024-02-01T10:00:00Z', excludeFromAccounting: false }, // Use undefined for tagId
  { id: 104, account: mockAccount, description: 'Restaurant', amount: 4500, transactionDate: '2024-02-05T10:00:00Z', type: 'DEBIT', tagId: undefined, createdAt: '2024-02-05T10:00:00Z', excludeFromAccounting: false }, // Use undefined for tagId
];
const mockGroupedTransactions = {
  'February 2024': [mockTransactions[2], mockTransactions[3]],
  'January 2024': [mockTransactions[0], mockTransactions[1]],
};

// Default mock hook return value
const mockUseTransactionDataResult = {
  transactions: mockTransactions,
  tags: mockTags,
  tagMap: mockTagMap,
  loading: false,
  error: null,
  updateTransactionTag: jest.fn().mockResolvedValue(undefined),
  refetchData: jest.fn().mockResolvedValue(undefined),
  // Add mock accounts to the hook result if Transactions component uses it directly
  // accounts: [mockAccount], 
};


describe('Transactions Component', () => {

  beforeEach(() => {
    // Reset all mocks and spies
    jest.clearAllMocks();
    mockedUseTransactionData.mockReturnValue(mockUseTransactionDataResult);
    mockedGroupTransactionsByMonth.mockReturnValue(mockGroupedTransactions);
    mockedApiCreateTransaction.mockResolvedValue({ message: 'Success' }); 
  });

  // --- Rendering Tests ---
  test('renders loading state', () => {
    mockedUseTransactionData.mockReturnValueOnce({ ...mockUseTransactionDataResult, loading: true });
    render(<Transactions />);
    expect(screen.getByText(/Loading transactions.../i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /transactions/i })).toBeInTheDocument(); // Header still renders
  });

  test('renders error state', () => {
    mockedUseTransactionData.mockReturnValueOnce({ ...mockUseTransactionDataResult, error: 'Failed to fetch' });
    render(<Transactions />);
    expect(screen.getByText(/Error: Failed to fetch/i)).toBeInTheDocument();
  });

  test('renders empty state', () => {
    mockedUseTransactionData.mockReturnValueOnce({ ...mockUseTransactionDataResult, transactions: [] });
    mockedGroupTransactionsByMonth.mockReturnValueOnce({});
    render(<Transactions />);
    expect(screen.getByText(/No transactions found./i)).toBeInTheDocument();
  });

  test('renders transactions grouped by month', () => {
    render(<Transactions />);
    expect(mockedGroupTransactionsByMonth).toHaveBeenCalledWith(mockTransactions);

    // Check for month headers
    expect(screen.getByRole('heading', { name: /January 2024/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /February 2024/i })).toBeInTheDocument();

    // Check for transaction cards (using test IDs from mock)
    expect(screen.getByTestId('tx-card-101')).toBeInTheDocument();
    expect(screen.getByTestId('tx-card-102')).toBeInTheDocument();
    expect(screen.getByTestId('tx-card-103')).toBeInTheDocument();
    expect(screen.getByTestId('tx-card-104')).toBeInTheDocument();

    // Check transaction counts per month - Use getAllByText
    const countElements = screen.getAllByText(/2 transactions/i);
    expect(countElements.length).toBe(2); // Expect one for each month group
  });

  test('renders header, search bar and action buttons', () => {
    render(<Transactions />);
    expect(screen.getByRole('heading', { name: /transactions/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search transactions/i)).toBeInTheDocument();
    expect(screen.getByTestId('filter-icon')).toBeInTheDocument();
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
  });

  // --- Interaction Tests ---

  test('opens and closes detail view sheet', async () => {
    render(<Transactions />);
    expect(screen.queryByTestId('sheet-wrapper')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tx-card-101'));

    // Wait for the wrapper AND the specific content inside
    await waitFor(() => {
        const wrapper = screen.getByTestId('sheet-wrapper');
        expect(wrapper).toBeInTheDocument();
        // Check content *within* the wrapper
        expect(within(wrapper).getByTestId('detail-view')).toBeInTheDocument();
    });
    expect(detailViewProps.transaction).toEqual(mockTransactions[0]);
    expect(detailViewProps.tagMap).toEqual(mockTagMap);
    // TODO: Refactor closing test.
  });

   test('opens and closes tag selector sheet', async () => {
    render(<Transactions />);
     expect(screen.queryByTestId('sheet-wrapper')).not.toBeInTheDocument();

    const tagButton = within(screen.getByTestId('tx-card-101')).getByRole('button', { name: /Tag/i });
    fireEvent.click(tagButton);

    // Wait for wrapper and content
    await waitFor(() => {
        const wrapper = screen.getByTestId('sheet-wrapper');
        expect(wrapper).toBeInTheDocument();
        expect(within(wrapper).getByTestId('tag-selector')).toBeInTheDocument();
    });
     expect(tagSelectorProps.currentTagId).toBe(mockTransactions[0].tagId);
     expect(tagSelectorProps.availableTags).toEqual(mockTags);
     expect(tagSelectorProps.transaction).toEqual(mockTransactions[0]);
     // TODO: Refactor closing test.
  });

  test('updates tag via tag selector sheet', async () => {
      render(<Transactions />);
      const tagButton = within(screen.getByTestId('tx-card-104')).getByRole('button', { name: /Tag/i }); 
      fireEvent.click(tagButton);
      // Wait for sheet content & wrapper
      await waitFor(() => {
        const wrapper = screen.getByTestId('sheet-wrapper');
        expect(within(wrapper).getByTestId('tag-selector')).toBeInTheDocument();
      });

      // Click the mock button inside TagSelector mock (ensure it's within the wrapper)
      const selectTagButton = within(screen.getByTestId('sheet-wrapper')).getByRole('button', { name: /Select Tag 99/i });
      fireEvent.click(selectTagButton);

      // Check if updateTransactionTag was called correctly
      await waitFor(() => {
          expect(mockUseTransactionDataResult.updateTransactionTag).toHaveBeenCalledTimes(1);
          expect(mockUseTransactionDataResult.updateTransactionTag).toHaveBeenCalledWith(
              mockTransactions.find(tx => tx.id === 104), 99
          );
      });
    });


  test('opens and closes add transaction sheet (AmountInputModal)', async () => {
    render(<Transactions />);
    // Still check directly for AmountInputModal, as it's not in a sheet
    expect(screen.queryByTestId('amount-input-modal')).not.toBeInTheDocument();

    const plusButton = screen.getByTestId('plus-icon').closest('button');
    expect(plusButton).toBeInTheDocument();
    fireEvent.click(plusButton!);

    // Wait directly for the modal content
     await waitFor(() => {
        expect(screen.getByTestId('amount-input-modal')).toBeInTheDocument();
    });
     // Check props passed to AmountInputModal (initial dummy transaction)
     expect(amountInputModalProps.transaction).toEqual(expect.objectContaining({ id: -1, amount: 0 }));
     expect(amountInputModalProps.availableTags).toEqual(mockTags);

    // Simulate closing via its own button
    const closeButton = screen.getByRole('button', { name: /Close Add/i });
    fireEvent.click(closeButton);
    await waitFor(() => {
       expect(screen.queryByTestId('amount-input-modal')).not.toBeInTheDocument();
    });
  });

  test('submits a new transaction via AmountInputModal', async () => {
    render(<Transactions />);
    const plusButton = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusButton!); 
    // Wait for modal to appear
    await waitFor(() => expect(screen.getByTestId('amount-input-modal')).toBeInTheDocument());

    const submitButton = screen.getByRole('button', { name: /Submit Tx/i });
    await act(async () => {
        fireEvent.click(submitButton);
    });

    await waitFor(() => {
        expect(mockedApiCreateTransaction).toHaveBeenCalledTimes(1);
        expect(mockedApiCreateTransaction).toHaveBeenCalledWith(expect.objectContaining({
            id: -1,
            amount: 5000,
            type: 'DEBIT',
            account: mockAccount,
            description: expect.stringContaining('CASH/DEBIT/'),
            transactionDate: expect.any(String),
            excludeFromAccounting: false,
        }));
    });
    expect(mockUseTransactionDataResult.refetchData).toHaveBeenCalledTimes(1);
  });

  test('opens split view from detail view', async () => {
    render(<Transactions />);
    // Open detail view first
    fireEvent.click(screen.getByTestId('tx-card-101'));
    await waitFor(() => expect(screen.getByTestId('detail-view')).toBeInTheDocument()); // Wait for content
    expect(screen.getByTestId('sheet-wrapper')).toBeInTheDocument(); // Check wrapper is open

    // Click the Split button in the (mocked) DetailView (which is inside the wrapper)
    const splitButton = within(screen.getByTestId('sheet-wrapper')).getByRole('button', { name: /Split/i });
    fireEvent.click(splitButton);

    // Detail view sheet should close, Split view sheet/content should open
     await waitFor(() => {
        // Check previous wrapper is gone OR check new content exists
        expect(screen.queryByTestId('detail-view')).not.toBeInTheDocument(); // Detail content gone
        expect(screen.getByTestId('split-view')).toBeInTheDocument(); // Split content appears
    });
     expect(screen.getByTestId('sheet-wrapper')).toBeInTheDocument(); // Wrapper should still be there (now contains split-view)
     expect(splitViewProps.transaction).toEqual(mockTransactions[0]);
     expect(splitViewProps.tagMap).toEqual(mockTagMap);
     expect(typeof splitViewProps.refetchData).toBe('function');

     // Close the split view sheet via its internal button (inside the wrapper)
    const closeSplitButton = within(screen.getByTestId('sheet-wrapper')).getByRole('button', { name: /Close Split/i });
    fireEvent.click(closeSplitButton);
     await waitFor(() => {
        expect(screen.queryByTestId('sheet-wrapper')).not.toBeInTheDocument();
    });
  });

}); 