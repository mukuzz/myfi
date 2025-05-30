import React, { useEffect, useMemo } from 'react';
import Card from './Card';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchTransactionRange } from '../store/slices/transactionsSlice';
import { Transaction } from '../types'; // Import Transaction type
import CurrencyDisplay from './AmountDisplay';
import MonthlyCashFlowSkeleton from './skeletons/MonthlyCashFlowSkeleton'; // Import the skeleton
import { useNavigation } from '../hooks/useNavigation'; // Added import
import CashFlowDetailsScreen from '../screens/CashFlowDetailsScreen'; // Added import
import { LuMinus, LuPlus } from 'react-icons/lu';

interface MonthlyCashFlow {
    month: string;
    year: number;
    incoming: number;
    outgoing: number;
    invested: number;
}

const MonthlyCashFlowCard: React.FC = () => {
    const dispatch = useAppDispatch();
    const { navigateTo } = useNavigation(); // Added navigation hook
    const {
        transactions, // Use main transactions list
        status,       // Use main status
        error         // Use main error
    } = useAppSelector((state) => state.transactions);

    const isLoading = status === 'loading';

    // Calculate date range for last 3 months
    const dateRange = useMemo(() => {
        const now = new Date();
        const endYear = now.getFullYear();
        const endMonth = now.getMonth() + 1; // Current month (1-indexed)
        
        // Start from 2 months ago (to get 3 months total including current)
        const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1; // 1-indexed
        
        return { startYear, startMonth, endYear, endMonth };
    }, []);

    useEffect(() => {
        if (status === 'idle' || status === 'failed') {
            const { startYear, startMonth, endYear, endMonth } = dateRange;
            dispatch(fetchTransactionRange({ startYear, startMonth, endYear, endMonth }));
        }
    }, [status, dispatch, dateRange]);

    const monthlyData = useMemo((): MonthlyCashFlow[] => {
        if (status === 'loading') {
            return [];
        }

        // Generate array of last 3 months
        const months: MonthlyCashFlow[] = [];
        const now = new Date();
        
        for (let i = 2; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = monthDate.getFullYear();
            const monthIndex = monthDate.getMonth(); // 0-indexed for filtering
            const monthName = monthDate.toLocaleString('default', { month: 'short' }).toUpperCase();
            
            // Filter transactions for this specific month
            const monthTransactions = transactions.filter(tx => {
                const txDate = new Date(tx.transactionDate);
                return txDate.getFullYear() === year && txDate.getMonth() === monthIndex;
            });

            let incoming = 0;
            let outgoing = 0;
            let invested = 0; // Placeholder for investment logic

            monthTransactions.forEach((tx: Transaction) => {
                if (tx.excludeFromAccounting) return; // Skip excluded transactions

                if (tx.type === 'CREDIT') {
                    incoming += tx.amount;
                } else if (tx.type === 'DEBIT') {
                    // TODO: Add logic to identify investment transactions
                    // For now, all non-excluded debits are considered outgoing
                    outgoing += tx.amount;
                    // Example: if (tx.tagId === INVESTMENT_TAG_ID) { invested += tx.amount; }
                }
            });

            months.push({
                month: monthName,
                year,
                incoming,
                outgoing,
                invested
            });
        }

        return months;
    }, [transactions, status]);

    const handleCardClick = () => {
        navigateTo(<CashFlowDetailsScreen />);
    };

    return (
        <Card
            className="flex flex-col cursor-pointer"
            onClick={handleCardClick}
        >
            {/* Content Area */}
            <div className="p-4 space-y-4 flex-grow overflow-y-auto bg-secondary">
                <div className="flex flex-row text-muted-foreground items-center justify-between">
                    <h1 className="font-bold">Cash Flow</h1>
                    <div className="text-xs font-semibold text-muted-foreground">
                        Last 3 Months
                    </div>
                </div>

                {isLoading && <MonthlyCashFlowSkeleton />}
                {!isLoading && (
                    <div className="space-y-2">
                        {monthlyData.map((monthData, index) => (
                            <div key={`${monthData.year}-${monthData.month}`}>
                                <div className="grid grid-cols-3 items-center font-medium">
                                    <div className="flex flex-grow flex-col justify-between items-start">
                                        <CurrencyDisplay 
                                            className="font-bold" 
                                            amount={monthData.incoming} 
                                            type="CREDIT" 
                                            showFraction={false} 
                                            showType={false}
                                            smallRupeeSymbol={false} 
                                        />
                                    </div>
                                    <div className="flex flex-row items-center justify-center gap-1 text-xs font-mono font-semibold text-muted-foreground text-center">
                                        <LuPlus/>
                                        <span className="text-xs bg-muted py-1 px-2 rounded-xl text-muted-foreground">{monthData.month}</span>
                                        <LuMinus/>
                                    </div>
                                    <div className="flex flex-grow flex-col justify-between items-end">
                                        
                                        <CurrencyDisplay 
                                            className="font-bold" 
                                            amount={monthData.outgoing} 
                                            type="DEBIT" 
                                            showFraction={false} 
                                            showType={false}
                                            smallRupeeSymbol={false} 
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
};

export default MonthlyCashFlowCard; 