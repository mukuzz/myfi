import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './Home';
import '@testing-library/jest-dom';

// Mock child components
jest.mock('./SpendingSummary', () => () => <div data-testid="spending-summary">Spending Summary</div>);
jest.mock('./TotalBalanceCard', () => () => <div data-testid="total-balance-card">Total Balance</div>);
jest.mock('./AccountsDisplayCard', () => ({ title }: { title: string }) => <div data-testid={`accounts-display-${title.toLowerCase().replace(' ', '-')}`}>{title}</div>);
jest.mock('react-icons/fi', () => ({
  FiUser: () => <svg data-testid="user-icon" />,
}));

describe('Home Component', () => {
  test('renders the main heading', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /home/i, level: 1 })).toBeInTheDocument();
  });

  test('renders the user profile button', () => {
    render(<Home />);
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    // Could also test the button role if needed
    // expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('renders the TotalBalanceCard component', () => {
    render(<Home />);
    expect(screen.getByTestId('total-balance-card')).toBeInTheDocument();
  });

  test('renders the SpendingSummary component', () => {
    render(<Home />);
    expect(screen.getByTestId('spending-summary')).toBeInTheDocument();
  });

  test('renders two AccountsDisplayCard components with correct titles', () => {
    render(<Home />);
    expect(screen.getByTestId('accounts-display-bank-accounts')).toBeInTheDocument();
    expect(screen.getByText('Bank Accounts')).toBeInTheDocument();

    expect(screen.getByTestId('accounts-display-credit-cards')).toBeInTheDocument();
    expect(screen.getByText('Credit Cards')).toBeInTheDocument();
  });
}); 