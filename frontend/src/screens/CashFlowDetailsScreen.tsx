import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchTransactionsForMonth, fetchTransactionRange } from '../store/slices/transactionsSlice';
import { Transaction } from '../types';
import CurrencyDisplay from '../components/AmountDisplay';
import { FiChevronLeft } from 'react-icons/fi'; // Back and Fullscreen icons
import CashFlowChart from '../components/CashFlowChart'; // Import the new chart component

// Helper function to calculate totals
const calculateTotals = (transactions: Transaction[], year: number, month: number): { incoming: number, outgoing: number, invested: number } => {
    const targetMonthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.transactionDate);
        // Month in Date object is 0-indexed, API month is 1-indexed
        return txDate.getFullYear() === year && txDate.getMonth() === month - 1; 
    });

    let incomingTotal = 0;
    let outgoingTotal = 0;
    let investedTotal = 0; // Placeholder

    targetMonthTransactions.forEach((tx: Transaction) => {
        if (tx.excludeFromAccounting) return;

        if (tx.type === 'CREDIT') {
            incomingTotal += tx.amount;
        } else if (tx.type === 'DEBIT') {
            // TODO: Refine investment logic
            outgoingTotal += tx.amount;
        }
    });

    return { incoming: incomingTotal, outgoing: outgoingTotal, invested: investedTotal };
};

// Helper function to calculate percentage change
const calculatePercentageChange = (current: number, previous: number): number | null => {
    if (previous === 0) {
        return current === 0 ? 0 : null; // Avoid division by zero, show 0% if both are 0, otherwise indicate infinite change (or handle as needed)
    }
    return ((current - previous) / previous) * 100;
};

// Helper function to check if data for a given month/year exists in the store
const doesMonthDataExist = (transactions: Transaction[], year: number, month: number): boolean => {
    // Month is 1-indexed here, Date month is 0-indexed
    return transactions.some(tx => {
        const txDate = new Date(tx.transactionDate);
        return txDate.getFullYear() === year && txDate.getMonth() === month - 1;
    });
};

// More robust helper to check if data for the entire range exists
const robustDoesRangeDataExist = (transactions: Transaction[], startYear: number, startMonth: number, endYear: number, endMonth: number): boolean => {
    let current = new Date(startYear, startMonth - 1, 1);
    const end = new Date(endYear, endMonth - 1, 1);

    while (current <= end) {
        const year = current.getFullYear();
        const month = current.getMonth() + 1;
        // Use the existing helper for individual months
        if (!doesMonthDataExist(transactions, year, month)) { 
            // If data for any month in the range is missing, return false
            // console.log(`Data missing for ${year}-${month}`); // Debug log
            return false;
        }
        // Move to the next month
        current.setMonth(current.getMonth() + 1);
    }
    // If all months checked and data exists, return true
    // console.log(`Data exists for range ${startYear}-${startMonth} to ${endYear}-${endMonth}`); // Debug log
    return true;
};

// Helper function to get month name abbreviation
const getMonthAbbr = (month: number) => {
    return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'short' });
}

const CashFlowDetailsScreen: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { transactions, status } = useAppSelector((state) => state.transactions);

    // Get initial year/month from location state, fallback to current month/year
    const initialState = location.state as { year: number; month: number } | undefined;
    const initialYear = initialState?.year ?? new Date().getFullYear();
    const initialMonth = initialState?.month ?? new Date().getMonth() + 1; // Ensure month is 1-indexed

    // Use state to manage the currently viewed month/year
    const [selectedYear, setSelectedYear] = useState<number>(initialYear);
    const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);

    // Define the range for the chart (e.g., 5 months centered on selected)
    const chartMonthsCount = 5; // Use an odd number for centering
    const chartDateRange = useMemo(() => {
        const selectedDate = new Date(selectedYear, selectedMonth - 1, 1);
        const monthsBefore = Math.floor(chartMonthsCount / 2);
        const monthsAfter = Math.floor(chartMonthsCount / 2);

        const startDate = new Date(selectedDate);
        startDate.setMonth(startDate.getMonth() - monthsBefore);

        const endDate = new Date(selectedDate);
        endDate.setMonth(endDate.getMonth() + monthsAfter);
        
        return {
            startYear: startDate.getFullYear(),
            startMonth: startDate.getMonth() + 1, // Convert back to 1-indexed
            endYear: endDate.getFullYear(),
            endMonth: endDate.getMonth() + 1, // Convert back to 1-indexed
        };
    }, [selectedYear, selectedMonth]);

    // Calculate previous month based on selected state
    const { prevYear, prevMonth } = useMemo(() => {
        const date = new Date(selectedYear, selectedMonth - 1, 1); // Use state vars
        date.setMonth(date.getMonth() - 1);
        return { prevYear: date.getFullYear(), prevMonth: date.getMonth() + 1 };
    }, [selectedYear, selectedMonth]); // Depend on state vars

    // Track if fetches for the current keys have been initiated in this render cycle
    const fetchInitiatedRef = useRef<{ rangeKey?: string; prevKey?: string; range?: boolean; prev?: boolean }>({}); 

    useEffect(() => {
        const { startYear, startMonth, endYear, endMonth } = chartDateRange;
        const rangeKey = `${startYear}-${startMonth}-${endYear}-${endMonth}`;
        const prevKey = `${prevYear}-${prevMonth}`;

        // Check if the keys have changed since the last run
        const rangeChanged = fetchInitiatedRef.current.rangeKey !== rangeKey;
        const prevChanged = fetchInitiatedRef.current.prevKey !== prevKey;

        // If range key changed, reset its initiated flag
        if (rangeChanged) {
            fetchInitiatedRef.current.rangeKey = rangeKey;
            fetchInitiatedRef.current.range = false; 
        }
        // If prev key changed, reset its initiated flag
        if (prevChanged) {
            fetchInitiatedRef.current.prevKey = prevKey;
            fetchInitiatedRef.current.prev = false;
        }

        // Read current status and transactions directly here
        const currentStatus = status; // Get status from closure
        const currentTransactions = transactions; // Get transactions from closure

        // Check and Fetch Range Data (if not already initiated for this specific range key)
        if (!fetchInitiatedRef.current.range && 
            currentStatus !== 'loading' && 
            currentStatus !== 'loadingMore' && 
            !robustDoesRangeDataExist(currentTransactions, startYear, startMonth, endYear, endMonth)) 
        {
            console.log(`EFFECT: Dispatching fetchTransactionRange for range: ${rangeKey}`);
            dispatch(fetchTransactionRange({ startYear, startMonth, endYear, endMonth }));
            fetchInitiatedRef.current.range = true; // Mark as initiated for this range key
        }

        // Check and Fetch Previous Month Data (if not already initiated for this specific prev key)
        if (!fetchInitiatedRef.current.prev && 
            currentStatus !== 'loading' && 
            currentStatus !== 'loadingMore' && 
            !doesMonthDataExist(currentTransactions, prevYear, prevMonth)) 
        {
            console.log(`EFFECT: Dispatching fetchTransactionsForMonth for prev: ${prevKey}`);
            dispatch(fetchTransactionsForMonth({ year: prevYear, month: prevMonth }));
            fetchInitiatedRef.current.prev = true; // Mark as initiated for this prev key
        }

    // Dependencies: Only re-run when the core date definitions change.
    // We explicitly read `status` and `transactions` inside the effect from the closure
    // instead of adding them as dependencies to prevent loops caused by their updates.
    }, [dispatch, chartDateRange, prevYear, prevMonth]); 

    const currentMonthTotals = useMemo(() => {
        // Calculate based on selectedYear/selectedMonth
        return calculateTotals(transactions, selectedYear, selectedMonth);
    }, [transactions, selectedYear, selectedMonth]);

    const previousMonthTotals = useMemo(() => {
        // Calculate based on prevYear/prevMonth
        return calculateTotals(transactions, prevYear, prevMonth);
    }, [transactions, prevYear, prevMonth]);

    // Calculate percentage changes
    const incomingChange = calculatePercentageChange(currentMonthTotals.incoming, previousMonthTotals.incoming);
    const investedChange = calculatePercentageChange(currentMonthTotals.invested, previousMonthTotals.invested);
    const outgoingChange = calculatePercentageChange(currentMonthTotals.outgoing, previousMonthTotals.outgoing);

    const isLoading = status === 'loading'; // Keep this simple loading indicator for now
    const currentMonthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });

    // Prepare data for the chart
    const chartData = useMemo(() => {
        const data: { month: string; incoming: number; outgoing: number; invested: number }[] = [];
        const { startYear, startMonth } = chartDateRange;
        // The 'end' for iteration should be the selected month itself
        const endIterationDate = new Date(selectedYear, selectedMonth - 1, 1);

        let current = new Date(startYear, startMonth - 1, 1);

        // Iterate from the start date up to the endIterationDate (inclusive)
        while (current <= endIterationDate) {
            const year = current.getFullYear();
            const month = current.getMonth() + 1;
            const totals = calculateTotals(transactions, year, month);
            data.push({
                month: getMonthAbbr(month), // Use short month name
                incoming: totals.incoming,
                outgoing: totals.outgoing,
                invested: totals.invested,
            });
            // Move to the next month
            current.setMonth(current.getMonth() + 1);
        }
        return data;
        // Depend on selectedYear/Month as well now, because the end point depends on them
    }, [transactions, chartDateRange, selectedYear, selectedMonth]);

    // Get the abbreviation for the selected month to pass to the chart
    const selectedMonthAbbr = getMonthAbbr(selectedMonth);

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Header Bar */}
            <header className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                <button onClick={() => navigate(-1)} className="p-2">
                    <FiChevronLeft size={24} />
                </button>
                <h1 className="text-lg font-semibold">Cash Flow</h1>
                <div className="w-8"></div> {/* Spacer */}
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="p-4 bg-card mb-4">
                    {/* Top Section (Month, Percentages, Totals) */}
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            {/* Month/Year Title - Use state variables */}
                            <h2 className="text-xl font-bold">{currentMonthName} {selectedYear}</h2>
                            {/* Percentage Changes */}
                            <div className="text-xs text-muted-foreground mt-1 space-x-4 flex items-center">
                                {incomingChange !== null && (
                                    <span className={`flex items-center text-destructive`}>
                                        <span className="w-2 h-2 rounded-full bg-green-600 mr-1"></span>
                                        {Math.abs(incomingChange).toFixed(1)}% {incomingChange >= 0 ? 'more' : 'less'}
                                    </span>
                                )}
                                {investedChange !== null && (
                                    <span className={`flex items-center text-destructive`}>
                                        <span className="w-2 h-2 rounded-full bg-blue-600 mr-1"></span>
                                        {Math.abs(investedChange).toFixed(1)}% {investedChange >= 0 ? 'more' : 'less'}
                                    </span>
                                )}
                                {outgoingChange !== null && (
                                    <span className={`flex items-center text-destructive`}>
                                        <span className="w-2 h-2 rounded-full bg-red-600 mr-1"></span>
                                        {Math.abs(outgoingChange).toFixed(1)}% {outgoingChange >= 0 ? 'more' : 'less'}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">As compared to last month</p>
                        </div>
                    </div>

                    {/* Current Month Totals */}
                    {isLoading && chartData.length === 0 ? (
                         <p className="text-muted-foreground text-center py-4">Loading chart data...</p>
                    ) : (
                        <div className="flex flex-row justify-center">
                            <div className="flex justify-center space-x-2 items-center text-center bg-input rounded-2xl p-2">
                                <div className="flex flex-col items-center rounded-lg ">
                                    <span className="text-xs block text-white p-1 rounded-t-md bg-green-600">Incoming</span>
                                <div className="text-green-800 bg-green-200 px-3 py-.5 rounded-xl min-w-[100px] flex items-center justify-center">
                                    <CurrencyDisplay amount={currentMonthTotals.incoming} className="font-bold text-lg" type="CREDIT" showFraction={false} />
                                </div>
                            </div>
                            <div className="flex flex-col items-center rounded-lg">
                                <span className="text-xs block text-white bg-blue-600 p-1 rounded-t-md">Invested</span>
                                <div className="text-blue-800 bg-blue-200 px-3 py-.5 rounded-xl min-w-[100px] flex items-center justify-center">
                                    <CurrencyDisplay amount={currentMonthTotals.invested} className="font-bold text-lg" showType={false} showFraction={false} />
                                </div>
                            </div>
                            <div className="flex flex-col items-center rounded-lg">
                                <span className="text-xs block text-white bg-red-600 p-1 rounded-t-md">Outgoing</span>
                                <div className="text-red-800 bg-red-200 px-3 py-.5 rounded-xl min-w-[100px] flex items-center justify-center">
                                    <CurrencyDisplay amount={currentMonthTotals.outgoing} className="font-bold text-lg" type="DEBIT" showFraction={false} />
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Line Chart */} 
                    <div className="w-full h-[250px] mt-6 relative"> 
                        {/* Render the new chart component */}
                        <CashFlowChart 
                            data={chartData} 
                            selectedMonthAbbr={selectedMonthAbbr} 
                            isLoading={isLoading}
                        />
                    </div>
                </div>

            </main>
        </div>
    );
};

export default CashFlowDetailsScreen; 