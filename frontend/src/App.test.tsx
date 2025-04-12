import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { useIsMobile } from './hooks/useIsMobile';

// Mock child components
jest.mock('./components/Home', () => () => <div data-testid="home-component">Home</div>);
jest.mock('./components/Transactions', () => () => <div data-testid="transactions-component">Transactions</div>);
jest.mock('./components/BottomNav', () => ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => (
  <nav data-testid="bottom-nav">
    <button onClick={() => setActiveTab('Home')}>Home Tab</button>
    <button onClick={() => setActiveTab('Transactions')}>Transactions Tab</button>
    <span>Active: {activeTab}</span>
  </nav>
));
jest.mock('./components/RefreshBar', () => () => <div data-testid="refresh-bar">Refresh Bar</div>);

// Mock the useIsMobile hook
jest.mock('./hooks/useIsMobile');
const mockedUseIsMobile = useIsMobile as jest.Mock;

describe('App Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockedUseIsMobile.mockClear();
  });

  test('renders Home and Transactions side-by-side on desktop', () => {
    mockedUseIsMobile.mockReturnValue(false); // Simulate desktop
    render(<App />);

    expect(screen.getByTestId('home-component')).toBeInTheDocument();
    expect(screen.getByTestId('transactions-component')).toBeInTheDocument();
    expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument(); // BottomNav shouldn't be visible
    expect(screen.getByTestId('refresh-bar')).toBeInTheDocument();
  });

  test('renders Home initially on mobile', () => {
    mockedUseIsMobile.mockReturnValue(true); // Simulate mobile
    render(<App />);

    expect(screen.getByTestId('home-component')).toBeInTheDocument();
    expect(screen.queryByTestId('transactions-component')).not.toBeInTheDocument(); // Only one view at a time
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
    expect(screen.getByText('Active: Home')).toBeInTheDocument(); // Check initial active tab in mock
    expect(screen.getByTestId('refresh-bar')).toBeInTheDocument();
  });

  test('switches to Transactions tab on mobile when Transactions tab is clicked', () => {
    mockedUseIsMobile.mockReturnValue(true); // Simulate mobile
    render(<App />);

    // Initially Home is shown
    expect(screen.getByTestId('home-component')).toBeInTheDocument();
    expect(screen.queryByTestId('transactions-component')).not.toBeInTheDocument();
    expect(screen.getByText('Active: Home')).toBeInTheDocument();

    // Click the Transactions tab button (via mocked BottomNav)
    const transactionsTabButton = screen.getByRole('button', { name: /Transactions Tab/i });
    fireEvent.click(transactionsTabButton);

    // Now Transactions should be shown
    expect(screen.queryByTestId('home-component')).not.toBeInTheDocument();
    expect(screen.getByTestId('transactions-component')).toBeInTheDocument();
    expect(screen.getByText('Active: Transactions')).toBeInTheDocument(); // Check updated active tab in mock
  });

  test('switches back to Home tab on mobile when Home tab is clicked', () => {
    mockedUseIsMobile.mockReturnValue(true); // Simulate mobile
    render(<App />);

    // Click the Transactions tab button first
    const transactionsTabButton = screen.getByRole('button', { name: /Transactions Tab/i });
    fireEvent.click(transactionsTabButton);

    // Ensure we are on Transactions tab
    expect(screen.getByTestId('transactions-component')).toBeInTheDocument();
    expect(screen.getByText('Active: Transactions')).toBeInTheDocument();

    // Click the Home tab button (via mocked BottomNav)
    const homeTabButton = screen.getByRole('button', { name: /Home Tab/i });
    fireEvent.click(homeTabButton);

    // Now Home should be shown again
    expect(screen.getByTestId('home-component')).toBeInTheDocument();
    expect(screen.queryByTestId('transactions-component')).not.toBeInTheDocument();
    expect(screen.getByText('Active: Home')).toBeInTheDocument(); // Check updated active tab in mock
  });
});
