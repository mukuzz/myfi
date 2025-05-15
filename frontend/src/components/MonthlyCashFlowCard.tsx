import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from './Card';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchTransactionsForMonth } from '../store/slices/transactionsSlice';
import { Transaction } from '../types'; // Import Transaction type
import { FiMoreHorizontal } from 'react-icons/fi'; // Import icon
import CurrencyDisplay from './AmountDisplay';
import MonthlyCashFlowSkeleton from './skeletons/MonthlyCashFlowSkeleton'; // Import the skeleton


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
        if (status === 'loading') {
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
    const monthYear = `${currentDate.toLocaleString('default', { month: 'long' }).toUpperCase()} ${currentDate.getFullYear()}`;

    return (
        // Make the Card itself clickable
        <Card
            className="flex flex-col cursor-pointer"
            onClick={handleCardClick}
        >
            <header className="pl-6 pr-4 border-b border-border flex items-center justify-between flex-shrink-0">
                {/* Display only Month Name in the header */}
                <h1 className="text-xs font-bold">Cash Flow</h1>
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
            <div className="p-6 space-y-4 flex-grow overflow-y-auto bg-secondary">
                <div className="text-xs font-semibold text-muted-foreground">
                    {monthYear}
                </div>

                {isLoading && <MonthlyCashFlowSkeleton />}
                {!isLoading && (
                    <div className="flex flex-row justify-between align-top font-medium flex-wrap gap-4">
                        <div className="flex flex-col justify-between">
                            <span className="mb-1">Incoming</span>
                            <hr />
                            <CurrencyDisplay className="text-xl mt-2 font-semibold" amount={incoming} type="CREDIT" showFraction={false} smallRupeeSymbol={true} />
                        </div>
                        <div className="flex flex-col justify-between">
                            <span className="mb-1">Outgoing</span>
                            <hr />
                            <CurrencyDisplay className="text-xl mt-2 font-semibold" amount={outgoing} type="DEBIT" showFraction={false} smallRupeeSymbol={true} />
                        </div>
                        <div className="flex flex-col justify-between">
                            <span className="mb-1">Invested</span>
                            <hr />
                            <CurrencyDisplay className="text-xl mt-2 font-semibold" amount={invested} showType={false} showFraction={false} smallRupeeSymbol={true} />
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default MonthlyCashFlowCard; 