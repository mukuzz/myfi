import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // Import MemoryRouter
import BottomNav from './BottomNav';
// Remove Tab import if not needed
import '@testing-library/jest-dom';

// Mock react-icons to avoid rendering actual SVGs
jest.mock('react-icons/fi', () => ({
  FiHome: () => <svg data-testid="home-icon" />,
  FiList: () => <svg data-testid="list-icon" />,
}));

// Mock react-icons if they cause issues in tests
// jest.mock('react-icons/ri', () => ({
//   RiHomeLine: () => <svg data-testid="home-icon" />,
//   RiFileListLine: () => <svg data-testid="transactions-icon" />,
// }));
// jest.mock('react-icons/ri', () => ({
//   RiHomeFill: () => <svg data-testid="home-icon-fill" />,
//   RiFileListFill: () => <svg data-testid="transactions-icon-fill" />,
// }));

describe('BottomNav Component', () => {
  // Helper function to render with Router context
  const renderWithRouter = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <BottomNav />
      </MemoryRouter>
    );
  };

  test('renders navigation links', () => {
    renderWithRouter();
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /transactions/i })).toBeInTheDocument();
    // Check if icons are rendered
    expect(screen.getByTestId('home-icon')).toBeInTheDocument();
    expect(screen.getByTestId('list-icon')).toBeInTheDocument();
  });

  test('highlights the active tab (Home)', () => {
    renderWithRouter(['/']); // Start at the root path
    const homeLink = screen.getByRole('link', { name: /home/i });
    const transactionsLink = screen.getByRole('link', { name: /transactions/i });

    expect(homeLink).toHaveClass('accent-secondary-foreground');
    expect(homeLink).not.toHaveClass('text-muted-foreground');
    expect(transactionsLink).toHaveClass('text-muted-foreground');
    expect(transactionsLink).not.toHaveClass('accent-secondary-foreground');
  });

  test('highlights the active tab (Transactions)', () => {
    renderWithRouter(['/transactions']); // Start at the transactions path
    const homeLink = screen.getByRole('link', { name: /home/i });
    const transactionsLink = screen.getByRole('link', { name: /transactions/i });

    expect(homeLink).toHaveClass('text-muted-foreground');
    expect(homeLink).not.toHaveClass('accent-secondary-foreground');
    expect(transactionsLink).toHaveClass('accent-secondary-foreground');
    expect(transactionsLink).not.toHaveClass('text-muted-foreground');
  });

  // Remove tests checking setActiveTab mock calls
  // Optional: Add tests to check if clicking links changes the location 
  // if needed, but MemoryRouter handles this inherently.

}); 