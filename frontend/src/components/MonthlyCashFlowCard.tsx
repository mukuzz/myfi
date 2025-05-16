import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from './Card';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchTransactionsForMonth } from '../store/slices/transactionsSlice';
import { Transaction } from '../types'; // Import Transaction type
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

            {/* Content Area */}
            <div className="p-4 space-y-4 flex-grow overflow-y-auto bg-secondary">
                <div className="flex flex-row text-muted-foreground items-center justify-between">
                    <h1 className=" font-bold">Cash Flow</h1>
                    <div className="text-xs font-semibold text-muted-foreground">
                        {monthYear}
                    </div>
                </div>

                {isLoading && <MonthlyCashFlowSkeleton />}
                {!isLoading && (
                    <div className="flex flex-row justify-between align-top font-medium flex-wrap">
                        <div className="flex flex-grow flex-col justify-between items-start">
                            <span className="text-sm mb-2">Incoming</span>
                            <hr className='w-full' />
                            <CurrencyDisplay className="text-2xl mt-3 font-bold" amount={incoming} type="CREDIT" showFraction={false} smallRupeeSymbol={true} />
                        </div>
                        <div className="flex flex-grow flex-col justify-between items-end">
                            <span className="text-sm mb-2">Outgoing</span>
                            <hr className='w-full' />
                            <CurrencyDisplay className="text-2xl mt-3 font-bold" amount={outgoing} type="DEBIT" showFraction={false} smallRupeeSymbol={true} />
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default MonthlyCashFlowCard; 