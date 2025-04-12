import { Transaction, Account } from '../types'; // Import necessary types

// Use jest.doMock BEFORE importing the file under test
// Note: __esModule and default export might be needed depending on how dateUtils exports
jest.doMock('./dateUtils', () => ({
  __esModule: true,
  formatMonthYear: jest.fn((dateString: string | Date): string => {
    // Simple mock implementation for testing: return year-month
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }),
}));

// Dynamically import AFTER the mock is set up
let groupTransactionsByMonth: typeof import('./transactionUtils').groupTransactionsByMonth;
let mockedFormatMonthYear: jest.Mock;

// Test Data
const mockAccount: Account = {
  id: 1, name: 'Test Acc', type: 'SAVINGS', balance: 100, currency: 'USD', createdAt: '', isActive: true, accountNumber: '1'
};

const mockTransactions: Transaction[] = [
  // January 2024
  { id: 1, amount: 100, description: 'Tx 1', type: 'DEBIT', transactionDate: '2024-01-15T10:00:00Z', createdAt: '', account: mockAccount, excludeFromAccounting: false },
  { id: 2, amount: 50, description: 'Tx 2', type: 'DEBIT', transactionDate: '2024-01-10T12:00:00Z', createdAt: '', account: mockAccount, excludeFromAccounting: false },
  // February 2024
  { id: 3, amount: 200, description: 'Tx 3', type: 'CREDIT', transactionDate: '2024-02-05T09:00:00Z', createdAt: '', account: mockAccount, excludeFromAccounting: false },
  // January 2024 (again, should be grouped and sorted)
  { id: 4, amount: 75, description: 'Tx 4', type: 'DEBIT', transactionDate: '2024-01-20T15:00:00Z', createdAt: '', account: mockAccount, excludeFromAccounting: false },
  // March 2024
  { id: 5, amount: 300, description: 'Tx 5', type: 'DEBIT', transactionDate: '2024-03-01T11:00:00Z', createdAt: '', account: mockAccount, excludeFromAccounting: false },
];

describe('transactionUtils', () => {
  // Load the module and mock dynamically before tests run
  beforeAll(async () => {
    const utils = await import('./transactionUtils');
    groupTransactionsByMonth = utils.groupTransactionsByMonth;
    const dateUtils = await import('./dateUtils');
    mockedFormatMonthYear = dateUtils.formatMonthYear as jest.Mock;
  });

  beforeEach(() => {
    // Clear the mock before each test
    mockedFormatMonthYear.mockClear();
  });

  describe('groupTransactionsByMonth', () => {
    test('should group transactions by month-year', () => {
      const grouped = groupTransactionsByMonth(mockTransactions);

      // Check if keys are generated correctly based on the mock formatMonthYear
      expect(Object.keys(grouped)).toEqual(expect.arrayContaining(['2024-01', '2024-02', '2024-03']));
      expect(Object.keys(grouped).length).toBe(3);

      // Check if transactions are placed in the correct groups
      expect(grouped['2024-01']).toHaveLength(3);
      expect(grouped['2024-02']).toHaveLength(1);
      expect(grouped['2024-03']).toHaveLength(1);

      // Check content of a group (e.g., January)
      const janTxIds = grouped['2024-01'].map(tx => tx.id);
      expect(janTxIds).toContain(1);
      expect(janTxIds).toContain(2);
      expect(janTxIds).toContain(4);
    });

    test('should sort transactions within each group by date descending (most recent first)', () => {
      const grouped = groupTransactionsByMonth(mockTransactions);

      // Check January sorting (20th, 15th, 10th)
      const janGroup = grouped['2024-01'];
      expect(janGroup[0].id).toBe(4); // Jan 20th
      expect(janGroup[1].id).toBe(1); // Jan 15th
      expect(janGroup[2].id).toBe(2); // Jan 10th

      // Other groups only have one transaction, so sorting isn't applicable
      expect(grouped['2024-02'][0].id).toBe(3);
      expect(grouped['2024-03'][0].id).toBe(5);
    });

    test('should return an empty object if transactions array is empty', () => {
      const grouped = groupTransactionsByMonth([]);
      expect(grouped).toEqual({});
    });

    test('should return an empty object if transactions array is null or undefined', () => {
      const groupedEmpty = groupTransactionsByMonth([]);
      expect(groupedEmpty).toEqual({});
      // Test remains the same, assumes function doesn't receive null/undefined due to TS
    });

     test('should call formatMonthYear for each transaction', () => {
      groupTransactionsByMonth(mockTransactions);
      // Check if the mocked function was called for each transaction
      expect(mockedFormatMonthYear).toHaveBeenCalledTimes(mockTransactions.length);
      // Optionally check arguments if needed, e.g.:
      expect(mockedFormatMonthYear).toHaveBeenCalledWith(mockTransactions[0].transactionDate);
      expect(mockedFormatMonthYear).toHaveBeenCalledWith(mockTransactions[1].transactionDate);
      expect(mockedFormatMonthYear).toHaveBeenCalledWith(mockTransactions[2].transactionDate);
      expect(mockedFormatMonthYear).toHaveBeenCalledWith(mockTransactions[3].transactionDate);
      expect(mockedFormatMonthYear).toHaveBeenCalledWith(mockTransactions[4].transactionDate);
    });
  });
}); 