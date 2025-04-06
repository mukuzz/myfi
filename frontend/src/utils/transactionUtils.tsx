import React from 'react';
import { FiCoffee, FiHome as FiHouse, FiMapPin, FiTag, FiSearch } from 'react-icons/fi';
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

// Map category string to icon component (customize as needed)
export const getTagIcon = (tag?: string): React.ReactElement => {
  switch (tag?.toLowerCase()) {
    case 'food & drinks': return <FiCoffee className="inline mr-1" />;
    case 'bill': return <FiHouse className="inline mr-1" />;
    case 'swiggy': return <FiMapPin className="inline mr-1" />;
    // Add more categories and icons
    default: return <FiSearch className="inline mr-1" />;
  }
}; 