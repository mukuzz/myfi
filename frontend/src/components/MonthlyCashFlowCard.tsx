import React, { useEffect, useMemo } from 'react';
import Card from './Card';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchTransactionsForMonth } from '../store/slices/transactionsSlice';
import { Transaction } from '../types'; // Import Transaction type
import { FiMoreHorizontal } from 'react-icons/fi'; // Import icon
import CurrencyDisplay from './AmountDisplay';


const MonthlyCashFlowCard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { 
    transactions, // Use main transactions list
    status,       // Use main status
    error         // Use main error
  } = useAppSelector((state) => state.transactions);

  const isLoading = status === 'loading';

  useEffect(() => {
    if (status === 'idle' || status === 'failed') {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // Month is 1-indexed for the API
      dispatch(fetchTransactionsForMonth({ year: currentYear, month: currentMonth }));
    }
  }, [status, dispatch]);

  const { incoming, outgoing, invested } = useMemo(() => {
    if (status !== 'succeeded') {
      return { incoming: 0, outgoing: 0, invested: 0 };
    }
    
    // Filter transactions for the current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const currentMonthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.transactionDate);
        return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
    });

    let incomingTotal = 0;
    let outgoingTotal = 0;
    let investedTotal = 0; // Placeholder for investment logic

    // Use the filtered transactions
    currentMonthTransactions.forEach((tx: Transaction) => {
      if (tx.excludeFromAccounting) return; // Skip excluded transactions

      if (tx.type === 'CREDIT') {
        incomingTotal += tx.amount;
      } else if (tx.type === 'DEBIT') {
        // TODO: Add logic to identify investment transactions
        // For now, all non-excluded debits are considered outgoing
        outgoingTotal += tx.amount;
        // Example: if (tx.tagId === INVESTMENT_TAG_ID) { investedTotal += tx.amount; }
      }
    });

    return { incoming: incomingTotal, outgoing: outgoingTotal, invested: investedTotal };

  }, [transactions, status]); // Depend on main transactions and status

  const currentDate = new Date();
  const monthYear = `${currentDate.toLocaleString('default', { month: 'long' }).toUpperCase()} ${currentDate.getFullYear()}`;

  return (
    <Card className="flex flex-col"> {/* Match SpendingSummary structure */}
      {/* Header similar to SpendingSummary */}
      <header className="pl-4 pr-2 border-b border-border flex items-center justify-between flex-shrink-0">
        <h1 className="text-xs font-bold">Cash Flow</h1>
        <button className="text-muted-foreground p-2">
          <FiMoreHorizontal size={20} />
        </button>
      </header>

      {/* Content Area */}
      <div className="p-4 space-y-4 flex-grow overflow-y-auto bg-secondary">
        <div className="text-xs font-semibold text-muted-foreground">
          {monthYear}
        </div>

        {isLoading && <p className="text-muted-foreground text-center">Loading...</p>}
        {!isLoading && (
          <div className="space-y-2 font-medium"> 
            <div className="flex justify-between">
              <span>Incoming</span>
              <CurrencyDisplay amount={incoming} className="font-medium" type="CREDIT" showFraction={false}/>
            </div>
            <div className="flex justify-between">
              <span>Outgoing</span>
              <CurrencyDisplay amount={outgoing} className="font-medium" type="DEBIT" showFraction={false}/>
            </div>
            <div className="flex justify-between">
              <span>Invested</span>
              <CurrencyDisplay amount={invested} className="font-medium" showType={false} showFraction={false}/> 
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MonthlyCashFlowCard; 