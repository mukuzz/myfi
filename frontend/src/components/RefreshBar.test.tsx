import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import RefreshBar from './RefreshBar';
import { getLastScrapeTime } from '../services/apiService';
import { formatDistanceToNow } from '../utils/datetimeUtils';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('react-icons/fi', () => ({
  FiRefreshCw: () => <svg data-testid="refresh-icon" />,
}));

// Replace the datetimeUtils mock with this plain function version
jest.mock('../utils/datetimeUtils', () => ({
  formatDistanceToNow: (time: number | Date | null | undefined, options?: any): string => {
    console.log(`>>> formatDistanceToNow (plain fn) called with time: ${time}`);
    if (time === null || time === undefined) {
      return 'Invalid Date Input'; // Return a specific string for debugging
    }
    // Return the expected formatted string for valid input
    return `${time}-formatted`;
  },
}));

// Mock API Services
jest.mock('../services/apiService', () => ({
  getLastScrapeTime: jest.fn(),
}));

// Mock Sheet Components
let refreshSheetContentProps: any = {}; // To capture props passed to RefreshSheetContent
jest.mock('./RefreshSheetContent', () => (props: any) => {
  refreshSheetContentProps = props; // Store props for inspection
  return (
    <div data-testid="refresh-sheet-content">
      Sheet Content
      {/* Button to simulate successful refresh */}
      <button onClick={props.onRefreshSuccess}>Simulate Refresh Success</button>
      {/* Button to simulate closing */}
      <button onClick={props.onClose}>Simulate Close</button>
    </div>
  );
});

let draggableSheetProps: any = {}; // To capture props passed to DraggableBottomSheet
jest.mock('./DraggableBottomSheet', () => (props: any) => {
    draggableSheetProps = props; // Store props for inspection
    return props.isOpen ? <div data-testid="draggable-sheet">{props.children}</div> : null;
});

// Helper to cast API mock
const mockedGetLastScrapeTime = getLastScrapeTime as jest.Mock;

describe('RefreshBar Component', () => {
  beforeEach(() => {
    // Reset mocks and captured props before each test
    mockedGetLastScrapeTime.mockClear();
    refreshSheetContentProps = {};
    draggableSheetProps = {};
    // Default successful API response for most tests
    mockedGetLastScrapeTime.mockResolvedValue(1678886400000); 
  });

  test('renders initial loading state and fetches time', async () => {
    render(<RefreshBar />);
    expect(screen.getByText(/Loading refresh status.../i)).toBeInTheDocument();
    expect(mockedGetLastScrapeTime).toHaveBeenCalledTimes(1);

    // Wait directly for the final expected text
    await waitFor(() => {
        // Check the text using the value returned by the plain mock function
        expect(screen.getByText(/Last refresh: 1678886400000-formatted/i)).toBeInTheDocument();
    });

    // Verify the mock call after waiting (no need to check mockedFormatDistanceToNow calls)
    expect(screen.queryByText(/Loading refresh status.../i)).not.toBeInTheDocument();
  });

  test('renders default text if fetching time fails', async () => {
    mockedGetLastScrapeTime.mockRejectedValueOnce(new Error('API Error')); 
    render(<RefreshBar />);
    expect(screen.getByText(/Loading refresh status.../i)).toBeInTheDocument();

    // Wait for the error text to appear (or loading to disappear)
    await waitFor(() => {
        // Option 1: Wait for loading text to disappear
        // expect(screen.queryByText(/Loading refresh status.../i)).not.toBeInTheDocument(); 
        // Option 2: Wait directly for the error text
        expect(screen.getByText(/Refresh Accounts/i)).toBeInTheDocument();
    });
    // Verify final state
    expect(screen.queryByText(/Last refresh:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading refresh status.../i)).not.toBeInTheDocument(); 
  });

  test('opens the bottom sheet when clicked', async () => {
    render(<RefreshBar />);
    await waitFor(() => {
        expect(screen.getByText(/Last refresh: 1678886400000-formatted/i)).toBeInTheDocument();
    });
    
    // Sheet should not be open initially
    expect(screen.queryByTestId('draggable-sheet')).not.toBeInTheDocument();
    // Check captured prop if mock allows
    // expect(draggableSheetProps.isOpen).toBe(false); 

    // Click the bar
    const refreshBarDiv = screen.getByText(/Last refresh:/i).parentElement;
    expect(refreshBarDiv).toBeInTheDocument();
    fireEvent.click(refreshBarDiv!);

    // Sheet should now be open
    await waitFor(() => {
        expect(screen.getByTestId('draggable-sheet')).toBeInTheDocument();
        expect(screen.getByTestId('refresh-sheet-content')).toBeInTheDocument();
    });
    // Check captured prop if mock allows
    // expect(draggableSheetProps.isOpen).toBe(true); 

     // Check props passed down to content
     expect(refreshSheetContentProps.lastRefreshTime).toBe(1678886400000);
     expect(typeof refreshSheetContentProps.onClose).toBe('function');
     expect(typeof refreshSheetContentProps.onRefreshSuccess).toBe('function');
  });

   test('closes the bottom sheet via onClose prop', async () => {
    render(<RefreshBar />);
     await waitFor(() => {
        expect(screen.getByText(/Last refresh: 1678886400000-formatted/i)).toBeInTheDocument();
     });

    // Open the sheet
    fireEvent.click(screen.getByText(/Last refresh:/i).parentElement!);
    await waitFor(() => expect(screen.getByTestId('draggable-sheet')).toBeInTheDocument());

    // Simulate closing from the sheet content (using the mock button)
    const closeButton = screen.getByRole('button', { name: /Simulate Close/i });
    fireEvent.click(closeButton);

    // Sheet should be closed
    await waitFor(() => {
      expect(screen.queryByTestId('draggable-sheet')).not.toBeInTheDocument();
    });
     // Check captured prop if mock allows
    // expect(draggableSheetProps.isOpen).toBe(false); 
  });


  test('refetches time when onRefreshSuccess is called from sheet content', async () => {
    const newTimestamp = 1678887400000;
    mockedGetLastScrapeTime.mockClear(); 
    mockedGetLastScrapeTime
        .mockResolvedValueOnce(1678886400000) // Initial fetch
        .mockResolvedValueOnce(newTimestamp);  // Fetch after success

    render(<RefreshBar />);

    await waitFor(() => expect(screen.getByText(/Last refresh: 1678886400000-formatted/i)).toBeInTheDocument());
    expect(mockedGetLastScrapeTime).toHaveBeenCalledTimes(1);

    // Open the sheet
    fireEvent.click(screen.getByText(/Last refresh:/i).parentElement!);
    await waitFor(() => expect(screen.getByTestId('draggable-sheet')).toBeInTheDocument());

    // Trigger the success callback
    await act(async () => {
        const successButton = screen.getByRole('button', { name: /Simulate Refresh Success/i });
        fireEvent.click(successButton);
        await Promise.resolve(); 
    });

    // Wait for the final text with the new timestamp
    await waitFor(() => {
      // Use the plain mock function's output format
      expect(screen.getByText(`Last refresh: ${newTimestamp}-formatted`)).toBeInTheDocument();
    });

    expect(mockedGetLastScrapeTime).toHaveBeenCalledTimes(2);
    // No need to check mockedFormatDistanceToNow calls
    expect(screen.queryByText(/Loading refresh status.../i)).not.toBeInTheDocument();
  });
}); 