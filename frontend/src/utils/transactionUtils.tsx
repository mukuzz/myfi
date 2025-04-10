import { Transaction } from '../types';
import { formatMonthYear } from './dateUtils';

// Group transactions by month/year
export const groupTransactionsByMonth = (transactions: Transaction[]): Record<string, Transaction[]> => {
  return transactions.reduce((acc, tx) => {
    // Use transactionDate for grouping
    const monthYear = formatMonthYear(tx.transactionDate);
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(tx);
    // Sort transactions within the group by date, descending (most recent first)
    acc[monthYear].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
    return acc;
  }, {} as Record<string, Transaction[]>);
};