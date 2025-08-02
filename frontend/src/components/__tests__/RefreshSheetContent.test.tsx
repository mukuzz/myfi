import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RefreshSheetContent from '../RefreshSheetContent';
import * as apiService from '../../services/apiService';
import { RefreshJobStatus, OperationStatusDetailType } from '../../types';
import accountsSlice from '../../store/slices/accountsSlice';
import transactionsSlice from '../../store/slices/transactionsSlice';

// Mock the API service
jest.mock('../../services/apiService');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

// Mock the date-time utils
jest.mock('../../utils/datetimeUtils', () => ({
  formatDistanceToNow: jest.fn((timestamp, options) => {
    if (options?.addSuffix) {
      return '2 minutes ago';
    }
    return '2 minutes';
  }),
}));

// Mock the AccountProgressItem component
jest.mock('../AccountProgressItem', () => {
  return function MockAccountProgressItem({ progress }: { progress: OperationStatusDetailType }) {
    return (
      <div data-testid={`progress-item-${progress.accountNumber}`}>
        <span>{progress.accountName}</span>
        <span>{progress.status}</span>
        {progress.errorMessage && <span data-testid="error-message">{progress.errorMessage}</span>}
      </div>
    );
  };
});

// Create a mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      accounts: accountsSlice,
      transactions: transactionsSlice,
    },
    preloadedState: {
      accounts: {
        accounts: [
          { id: 1, name: 'Test Account', accountNumber: '123456', type: 'SAVINGS', balance: 1000, currency: 'INR', isActive: true, createdAt: '2023-01-01' }
        ],
        status: 'idle',
        error: null,
        ...initialState.accounts
      },
      transactions: {
        transactions: [],
        status: 'idle',
        error: null,
        filters: {},
        ...initialState.transactions
      },
      ...initialState
    }
  });
};

const renderWithStore = (component: React.ReactElement, store: any) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('RefreshSheetContent', () => {
  const mockProps = {
    onClose: jest.fn(),
    lastRefreshTime: Date.now() - 120000, // 2 minutes ago
    onRefreshSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Render', () => {
    it('should render with last refresh time', () => {
      const store = createMockStore();
      
      mockedApiService.getOverallRefreshStatus.mockResolvedValue({
        progressMap: {},
        refreshInProgress: false,
      });

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      expect(screen.getByText('Last successful refresh:')).toBeInTheDocument();
      expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
      expect(screen.getByText('Refresh All')).toBeInTheDocument();
    });

    it('should render without last refresh time', () => {
      const store = createMockStore();
      const propsWithoutTime = { ...mockProps, lastRefreshTime: null };
      
      mockedApiService.getOverallRefreshStatus.mockResolvedValue({
        progressMap: {},
        refreshInProgress: false,
      });

      renderWithStore(<RefreshSheetContent {...propsWithoutTime} />, store);

      expect(screen.getByText('No successful refresh history found.')).toBeInTheDocument();
    });

    it('should display existing progress when refresh is in progress', async () => {
      const store = createMockStore();
      const mockProgress: OperationStatusDetailType = {
        accountNumber: 'GMAIL_SYNC_123',
        accountName: 'Email Processing',
        status: RefreshJobStatus.PROCESSING_IN_PROGRESS,
        startTime: '2023-01-01T10:00:00Z',
        lastUpdateTime: '2023-01-01T10:05:00Z',
        errorMessage: null,
        history: [],
        itemsProcessed: 25,
        itemsTotal: 100,
      };

      mockedApiService.getOverallRefreshStatus.mockResolvedValue({
        progressMap: { 'GMAIL_SYNC_123': mockProgress },
        refreshInProgress: true,
      });

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      await waitFor(() => {
        expect(screen.getByText('Refreshing...')).toBeInTheDocument();
        expect(screen.getByTestId('progress-item-GMAIL_SYNC_123')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Trigger', () => {
    it('should trigger refresh successfully', async () => {
      const store = createMockStore();
      
      mockedApiService.getOverallRefreshStatus
        .mockResolvedValueOnce({ progressMap: {}, refreshInProgress: false }) // Initial call
        .mockResolvedValueOnce({ progressMap: {}, refreshInProgress: false }); // After trigger
      
      mockedApiService.triggerFullRefresh.mockResolvedValue();

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      const refreshButton = screen.getByText('Refresh All');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockedApiService.triggerFullRefresh).toHaveBeenCalled();
      });
    });

    it('should handle refresh trigger failure', async () => {
      const store = createMockStore();
      
      mockedApiService.getOverallRefreshStatus.mockResolvedValue({
        progressMap: {},
        refreshInProgress: false,
      });
      
      mockedApiService.triggerFullRefresh.mockRejectedValue(new Error('Network error'));

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      const refreshButton = screen.getByText('Refresh All');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('should disable refresh when accounts are loading', async () => {
      const store = createMockStore({
        accounts: { status: 'loading', accounts: [], error: null }
      });
      
      mockedApiService.getOverallRefreshStatus.mockResolvedValue({
        progressMap: {},
        refreshInProgress: false,
      });

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      const refreshButton = screen.getByText('Refresh All');
      expect(refreshButton).toBeDisabled();

      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('Accounts are still loading, please wait...')).toBeInTheDocument();
      });
    });

    it('should show error when accounts failed to load', async () => {
      const store = createMockStore({
        accounts: { status: 'failed', accounts: [], error: 'Failed to load accounts' }
      });
      
      mockedApiService.getOverallRefreshStatus.mockResolvedValue({
        progressMap: {},
        refreshInProgress: false,
      });

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      const refreshButton = screen.getByText('Refresh All');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load accounts: Failed to load accounts/)).toBeInTheDocument();
      });
    });

    it('should show error when no accounts are configured', async () => {
      const store = createMockStore({
        accounts: { status: 'idle', accounts: [], error: null }
      });
      
      mockedApiService.getOverallRefreshStatus.mockResolvedValue({
        progressMap: {},
        refreshInProgress: false,
      });

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      const refreshButton = screen.getByText('Refresh All');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('No accounts configured in the application. Add accounts to enable refresh.')).toBeInTheDocument();
      });
    });
  });

  describe('Polling Behavior', () => {
    it('should start polling when refresh is in progress', async () => {
      const store = createMockStore();
      
      const mockProgressInProgress: OperationStatusDetailType = {
        accountNumber: 'GMAIL_SYNC_123',
        accountName: 'Email Processing',
        status: RefreshJobStatus.PROCESSING_IN_PROGRESS,
        startTime: '2023-01-01T10:00:00Z',
        lastUpdateTime: '2023-01-01T10:05:00Z',
        errorMessage: null,
        history: [],
      };

      const mockProgressCompleted: OperationStatusDetailType = {
        ...mockProgressInProgress,
        status: RefreshJobStatus.COMPLETED,
      };

      mockedApiService.getOverallRefreshStatus
        .mockResolvedValueOnce({ progressMap: { 'GMAIL_SYNC_123': mockProgressInProgress }, refreshInProgress: true })
        .mockResolvedValueOnce({ progressMap: { 'GMAIL_SYNC_123': mockProgressCompleted }, refreshInProgress: false });

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      await waitFor(() => {
        expect(screen.getByText('Refreshing...')).toBeInTheDocument();
      });

      // Advance timer to trigger next poll
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockedApiService.getOverallRefreshStatus).toHaveBeenCalledTimes(2);
      });
    });

    it('should stop polling when refresh completes successfully', async () => {
      const store = createMockStore();
      
      const mockProgressCompleted: OperationStatusDetailType = {
        accountNumber: 'GMAIL_SYNC_123',
        accountName: 'Email Processing',
        status: RefreshJobStatus.COMPLETED,
        startTime: '2023-01-01T10:00:00Z',
        lastUpdateTime: '2023-01-01T10:05:00Z',
        errorMessage: null,
        history: [],
      };

      mockedApiService.getOverallRefreshStatus
        .mockResolvedValueOnce({ progressMap: {}, refreshInProgress: false }) // Initial
        .mockResolvedValueOnce({ progressMap: { 'GMAIL_SYNC_123': mockProgressCompleted }, refreshInProgress: false }); // After trigger

      mockedApiService.triggerFullRefresh.mockResolvedValue();

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      const refreshButton = screen.getByText('Refresh All');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockProps.onRefreshSuccess).toHaveBeenCalled();
      });
    });

    it('should handle polling errors', async () => {
      const store = createMockStore();
      
      mockedApiService.getOverallRefreshStatus
        .mockResolvedValueOnce({ progressMap: {}, refreshInProgress: false }) // Initial
        .mockRejectedValueOnce(new Error('Polling failed'));

      mockedApiService.triggerFullRefresh.mockResolvedValue();

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      const refreshButton = screen.getByText('Refresh All');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to get refresh status: Polling failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when refresh completes with failures', async () => {
      const store = createMockStore();
      
      const mockProgressWithError: OperationStatusDetailType = {
        accountNumber: 'GMAIL_SYNC_123',
        accountName: 'Email Processing',
        status: RefreshJobStatus.ERROR,
        startTime: '2023-01-01T10:00:00Z',
        lastUpdateTime: '2023-01-01T10:05:00Z',
        errorMessage: 'Authentication failed',
        history: [],
      };

      mockedApiService.getOverallRefreshStatus
        .mockResolvedValueOnce({ progressMap: {}, refreshInProgress: false }) // Initial
        .mockResolvedValueOnce({ progressMap: { 'GMAIL_SYNC_123': mockProgressWithError }, refreshInProgress: false }); // After trigger

      mockedApiService.triggerFullRefresh.mockResolvedValue();

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      const refreshButton = screen.getByText('Refresh All');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText('One or more accounts failed to refresh. See details below.')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent('Authentication failed');
      });
    });

    it('should handle different error states', async () => {
      const store = createMockStore();
      
      const errorStates = [
        RefreshJobStatus.LOGIN_FAILED,
        RefreshJobStatus.PROCESSING_FAILED,
        RefreshJobStatus.LOGOUT_FAILED,
      ];

      for (const errorState of errorStates) {
        const mockProgressWithError: OperationStatusDetailType = {
          accountNumber: `TEST_${errorState}`,
          accountName: 'Test Account',
          status: errorState,
          startTime: '2023-01-01T10:00:00Z',
          lastUpdateTime: '2023-01-01T10:05:00Z',
          errorMessage: `Error for ${errorState}`,
          history: [],
        };

        mockedApiService.getOverallRefreshStatus.mockResolvedValue({
          progressMap: { [`TEST_${errorState}`]: mockProgressWithError },
          refreshInProgress: false,
        });

        const { rerender } = renderWithStore(<RefreshSheetContent {...mockProps} />, store);

        await waitFor(() => {
          expect(screen.getByTestId(`progress-item-TEST_${errorState}`)).toBeInTheDocument();
          expect(screen.getByText(errorState)).toBeInTheDocument();
        });

        // Clean up for next iteration
        rerender(<div />);
      }
    });
  });

  describe('Progress Display', () => {
    it('should display multiple operations progress', async () => {
      const store = createMockStore();
      
      const operation1: OperationStatusDetailType = {
        accountNumber: 'GMAIL_SYNC_1',
        accountName: 'Operation 1',
        status: RefreshJobStatus.COMPLETED,
        startTime: '2023-01-01T10:00:00Z',
        lastUpdateTime: '2023-01-01T10:05:00Z',
        errorMessage: null,
        history: [],
        itemsProcessed: 100,
        itemsTotal: 100,
      };

      const operation2: OperationStatusDetailType = {
        accountNumber: 'GMAIL_SYNC_2',
        accountName: 'Operation 2',
        status: RefreshJobStatus.PROCESSING_IN_PROGRESS,
        startTime: '2023-01-01T10:00:00Z',
        lastUpdateTime: '2023-01-01T10:05:00Z',
        errorMessage: null,
        history: [],
        itemsProcessed: 50,
        itemsTotal: 150,
      };

      mockedApiService.getOverallRefreshStatus.mockResolvedValue({
        progressMap: {
          'GMAIL_SYNC_1': operation1,
          'GMAIL_SYNC_2': operation2,
        },
        refreshInProgress: true,
      });

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      await waitFor(() => {
        expect(screen.getByTestId('progress-item-GMAIL_SYNC_1')).toBeInTheDocument();
        expect(screen.getByTestId('progress-item-GMAIL_SYNC_2')).toBeInTheDocument();
        expect(screen.getByText('Operation 1')).toBeInTheDocument();
        expect(screen.getByText('Operation 2')).toBeInTheDocument();
      });
    });

    it('should not display progress list when no operations exist', async () => {
      const store = createMockStore();
      
      mockedApiService.getOverallRefreshStatus.mockResolvedValue({
        progressMap: {},
        refreshInProgress: false,
      });

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      await waitFor(() => {
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Cleanup', () => {
    it('should cleanup polling on unmount', async () => {
      const store = createMockStore();
      
      mockedApiService.getOverallRefreshStatus.mockResolvedValue({
        progressMap: {},
        refreshInProgress: true,
      });

      const { unmount } = renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      await waitFor(() => {
        expect(mockedApiService.getOverallRefreshStatus).toHaveBeenCalled();
      });

      // Unmount the component
      unmount();

      // Advance timers to ensure no more polling occurs
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should not make additional calls after unmount
      expect(mockedApiService.getOverallRefreshStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle component re-render correctly', async () => {
      const store = createMockStore();
      
      mockedApiService.getOverallRefreshStatus.mockResolvedValue({
        progressMap: {},
        refreshInProgress: false,
      });

      const { rerender } = renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      await waitFor(() => {
        expect(screen.getByText('Refresh All')).toBeInTheDocument();
      });

      // Re-render with different props
      const newProps = { ...mockProps, lastRefreshTime: null };
      rerender(
        <Provider store={store}>
          <RefreshSheetContent {...newProps} />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('No successful refresh history found.')).toBeInTheDocument();
      });
    });
  });

  describe('Redux Integration', () => {
    it('should dispatch force refresh actions on successful completion', async () => {
      const store = createMockStore();
      
      const mockProgressCompleted: OperationStatusDetailType = {
        accountNumber: 'GMAIL_SYNC_123',
        accountName: 'Email Processing',
        status: RefreshJobStatus.COMPLETED,
        startTime: '2023-01-01T10:00:00Z',
        lastUpdateTime: '2023-01-01T10:05:00Z',
        errorMessage: null,
        history: [],
      };

      mockedApiService.getOverallRefreshStatus
        .mockResolvedValueOnce({ progressMap: {}, refreshInProgress: false }) // Initial
        .mockResolvedValueOnce({ progressMap: { 'GMAIL_SYNC_123': mockProgressCompleted }, refreshInProgress: false }); // After trigger

      mockedApiService.triggerFullRefresh.mockResolvedValue();

      // Spy on store dispatch
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      renderWithStore(<RefreshSheetContent {...mockProps} />, store);

      const refreshButton = screen.getByText('Refresh All');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockProps.onRefreshSuccess).toHaveBeenCalled();
        // Should dispatch force refresh actions
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
          type: expect.stringContaining('forceRefresh')
        }));
      });
    });
  });
});