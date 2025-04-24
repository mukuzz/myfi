import React, { useEffect, useMemo } from 'react';
import Card from './Card';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchCurrentMonthTransactions } from '../store/slices/transactionsSlice';
import { Transaction } from '../types'; // Import Transaction type
import { FiMoreHorizontal } from 'react-icons/fi'; // Import icon
import CurrencyDisplay from './AmountDisplay';


const MonthlyCashFlowCard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { 
    currentMonthTransactions,
    currentMonthStatus: transactionsStatus,
    currentMonthError: transactionsError 
  } = useAppSelector((state) => state.transactions);

  const isLoading = transactionsStatus === 'loading';
  const error = transactionsError;

  useEffect(() => {
    if (transactionsStatus === 'idle') {
      dispatch(fetchCurrentMonthTransactions());
    }
  }, [dispatch, transactionsStatus]);

  const { incoming, outgoing, invested } = useMemo(() => {
    if (transactionsStatus !== 'succeeded') {
      return { incoming: 0, outgoing: 0, invested: 0 };
    }

    let incomingTotal = 0;
    let outgoingTotal = 0;
    let investedTotal = 0; // Placeholder for investment logic

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

  }, [currentMonthTransactions, transactionsStatus]);

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
        {error && <p className="text-destructive text-center">Error: {error}</p>}
        {!isLoading && !error && (
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