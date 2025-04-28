import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from './Card';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchTransactionsForMonth } from '../store/slices/transactionsSlice';
import { Transaction } from '../types'; // Import Transaction type
import { FiMoreHorizontal } from 'react-icons/fi'; // Import icon
import CurrencyDisplay from './AmountDisplay';


const MonthlyCashFlowCard: React.FC = () => {
    const navigate = useNavigate();
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

    const handleCardClick = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // Month is 1-indexed
        // Navigate to the details screen, passing year/month in location state
        navigate('/cash-flow', { state: { year, month } });
    };

    const currentDate = new Date();
    // Keep only month name, year will be shown on the details screen or implicitly known
    const monthName = currentDate.toLocaleString('default', { month: 'long' }).toUpperCase();

    return (
        // Make the Card itself clickable
        <Card
            className="flex flex-col cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleCardClick}
        >
            <header className="pl-4 pr-2 border-b border-border flex items-center justify-between flex-shrink-0">
                {/* Display only Month Name in the header */}
                <h1 className="text-xs font-bold">Cash Flow - {monthName}</h1>
                <button
                    className="text-muted-foreground p-2"
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent card click when clicking the button
                        console.log("More options clicked"); // Placeholder for future action
                    }}
                >
                    <FiMoreHorizontal size={20} />
                </button>
            </header>

            {/* Content Area */}
            <div className="p-4 space-y-4 flex-grow overflow-y-auto bg-secondary">
                <div className="text-xs font-semibold text-muted-foreground">
                    {monthName}
                </div>

                {isLoading && <p className="text-muted-foreground text-center">Loading...</p>}
                {!isLoading && (
                    <div className="space-y-2 font-medium">
                        <div className="flex justify-between">
                            <span>Incoming</span>
                            <CurrencyDisplay amount={incoming} className="font-medium" type="CREDIT" showFraction={false} />
                        </div>
                        <div className="flex justify-between">
                            <span>Outgoing</span>
                            <CurrencyDisplay amount={outgoing} className="font-medium" type="DEBIT" showFraction={false} />
                        </div>
                        <div className="flex justify-between">
                            <span>Invested</span>
                            <CurrencyDisplay amount={invested} className="font-medium" showType={false} showFraction={false} />
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default MonthlyCashFlowCard; 