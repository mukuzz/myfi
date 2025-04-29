import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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

// Helper function to get full month name
const getMonthName = (year: number, month: number) => {
    return new Date(year, month - 1).toLocaleString('default', { month: 'long' });
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

    // Use state to manage the currently *selected* month/year (for data display)
    const [selectedYear, setSelectedYear] = useState<number>(initialYear);
    const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);

    // Define the range for fetching data (e.g., 24 months ending on selected)
    const dataFetchMonthsCount = 24; // Updated to 24 months
    const dataFetchDateRange = useMemo(() => {
        const selectedDate = new Date(selectedYear, selectedMonth - 1, 1);

        // End date is the selected month
        const endDate = new Date(selectedDate);

        // Start date is 23 months before the selected month (total 24 months including end)
        const startDate = new Date(selectedDate);
        startDate.setMonth(startDate.getMonth() - (dataFetchMonthsCount - 1));

        return {
            startYear: startDate.getFullYear(),
            startMonth: startDate.getMonth() + 1, // Convert back to 1-indexed
            endYear: endDate.getFullYear(),
            endMonth: endDate.getMonth() + 1, // Convert back to 1-indexed
        };
    }, [dispatch]);

    // Calculate previous month based on selected state
    const { prevYear, prevMonth } = useMemo(() => {
        const date = new Date(selectedYear, selectedMonth - 1, 1); // Use state vars
        date.setMonth(date.getMonth() - 1);
        return { prevYear: date.getFullYear(), prevMonth: date.getMonth() + 1 };
    }, [selectedYear, selectedMonth]); // Depend on state vars

    // Track if fetches for the current keys have been initiated
    const fetchInitiatedRef = useRef<{ rangeKey?: string; prevKey?: string; range?: boolean; prev?: boolean }>({});

    // Effect to fetch data for the required range and previous month
    useEffect(() => {
        const { startYear, startMonth, endYear, endMonth } = dataFetchDateRange;
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
            !robustDoesRangeDataExist(currentTransactions, startYear, startMonth, endYear, endMonth)) {
            console.log(`EFFECT: Dispatching fetchTransactionRange for range: ${rangeKey}`);
            dispatch(fetchTransactionRange({ startYear, startMonth, endYear, endMonth }));
            fetchInitiatedRef.current.range = true; // Mark as initiated for this range key
        }

        // Check and Fetch Previous Month Data (if not already initiated for this specific prev key)
        if (!fetchInitiatedRef.current.prev &&
            currentStatus !== 'loading' &&
            currentStatus !== 'loadingMore' &&
            !doesMonthDataExist(currentTransactions, prevYear, prevMonth)) {
            console.log(`EFFECT: Dispatching fetchTransactionsForMonth for prev: ${prevKey}`);
            dispatch(fetchTransactionsForMonth({ year: prevYear, month: prevMonth }));
            fetchInitiatedRef.current.prev = true; // Mark as initiated for this prev key
        }

        // Dependencies: Only re-run when the core date definitions change.
        // We explicitly read `status` and `transactions` inside the effect from the closure
        // instead of adding them as dependencies to prevent loops caused by their updates.
    }, [dispatch, dataFetchDateRange, prevYear, prevMonth]);

    // Prepare data for the chart - use the wider fetch range
    const chartData = useMemo(() => {
        const data: { year: number; month: number; monthAbbr: string; incoming: number; outgoing: number; invested: number }[] = [];
        const { startYear, startMonth, endYear, endMonth } = dataFetchDateRange;

        let current = new Date(startYear, startMonth - 1, 1);
        const end = new Date(endYear, endMonth - 1, 1);

        // Iterate through the *entire* fetch range
        while (current <= end) {
            const year = current.getFullYear();
            const month = current.getMonth() + 1;
            // Only add if data exists, otherwise chart might show gaps wrongly
            if (doesMonthDataExist(transactions, year, month)) {
                const totals = calculateTotals(transactions, year, month);
                data.push({
                    year: year,
                    month: month,
                    monthAbbr: getMonthAbbr(month), // Use short month name
                    incoming: totals.incoming,
                    outgoing: totals.outgoing,
                    invested: totals.invested,
                });
            }
            // Move to the next month
            current.setMonth(current.getMonth() + 1);
        }
        // Sort data chronologically just in case iteration order isn't guaranteed
        data.sort((a, b) => new Date(a.year, a.month - 1).getTime() - new Date(b.year, b.month - 1).getTime());
        return data;
    }, [transactions, dataFetchDateRange]); // Depend on the fetch range

    // Calculate totals for the *currently selected* month for display
    const currentMonthTotals = useMemo(() => {
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

    const isLoading = status === 'loading' || status === 'loadingMore';
    const currentMonthName = getMonthName(selectedYear, selectedMonth);

    // Callback function for the chart to update the selected month/year
    const handleMonthSelect = useCallback((year: number, month: number) => {
        // Avoid state updates if the month/year hasn't actually changed
        if (year !== selectedYear || month !== selectedMonth) {
            console.log(`DetailsScreen: handleMonthSelect called with ${month}/${year}`);
            setSelectedYear(year);
            setSelectedMonth(month);
        }
    }, [selectedYear, selectedMonth]); // Dependencies ensure we have the current state values

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
            <main className="flex-grow overflow-y-auto">
                <div className="bg-card mb-4">
                    {/* Top Section (Month, Percentages, Totals) */}
                    <div className="flex justify-between items-start p-8 pb-0 mb-4">
                        <div>
                            {/* Month/Year Title - Use state variables */}
                            <h2 className="text-xl font-bold">{currentMonthName} {selectedYear}</h2>
                            {/* Percentage Changes */}
                            <div className="text-xs text-muted-foreground mt-1 space-x-4 flex items-center">
                                {incomingChange !== null && incomingChange !== undefined && ( // Added undefined check
                                    <span className={`flex items-center text-primary`}> {/* 80% opacity */}
                                        <span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span> {/* 80% opacity */}
                                        {Math.abs(incomingChange).toFixed(1)}% {incomingChange >= 0 ? 'more' : 'less'}
                                    </span>
                                )}
                                {/* Invested Change - Placeholder logic still */}
                                {investedChange !== null && investedChange !== undefined && ( // Added undefined check
                                    <span className={`flex items-center text-primary`}> {/* 80% opacity */}
                                        <span className="w-2 h-2 rounded-full bg-blue-400 mr-1"></span> {/* 80% opacity */}
                                        {Math.abs(investedChange).toFixed(1)}% {investedChange >= 0 ? 'more' : 'less'}
                                    </span>
                                )}
                                {outgoingChange !== null && outgoingChange !== undefined && ( // Added undefined check
                                    <span className={`flex items-center text-primary`}> {/* 80% opacity */}
                                        <span className="w-2 h-2 rounded-full bg-red-400 mr-1"></span> {/* 80% opacity */}
                                        {Math.abs(outgoingChange).toFixed(1)}% {outgoingChange >= 0 ? 'more' : 'less'}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {previousMonthTotals.incoming !== 0 || previousMonthTotals.outgoing !== 0 ? `As compared to ${getMonthName(prevYear, prevMonth)}` : `No data for previous month (${getMonthName(prevYear, prevMonth)})`}
                            </p>
                        </div>
                    </div>

                    {/* Current Month Totals */}
                    {isLoading && chartData.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">Loading data...</p>
                    ) : (
                        <div className="flex flex-row justify-center">
                            <div className="flex justify-center space-x-2 items-center text-center bg-gray-300/80 rounded-2xl p-2"> {/* Added opacity to container */}
                                <div className="flex flex-col items-center rounded-lg ">
                                    <span className="text-xs block text-white p-1 px-1 rounded-t-md bg-green-400">Incoming</span> {/* 80% opacity */}
                                    <div className="bg-green-200 px-2 py-.5 rounded-md min-w-[80px] flex items-center justify-center"> {/* 80% opacity */}
                                        <CurrencyDisplay amount={currentMonthTotals.incoming} className="font-bold text-md" type="CREDIT" showFraction={false} />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center rounded-lg">
                                    <span className="text-xs block text-white bg-blue-400 p-1 px-1 rounded-t-md">Invested</span> {/* 80% opacity */}
                                    <div className="bg-blue-200 px-2 py-.5 rounded-md min-w-[80px] flex items-center justify-center"> {/* 80% opacity */}
                                        <CurrencyDisplay amount={currentMonthTotals.invested} className="font-bold text-md" showType={false} showFraction={false} />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center rounded-lg">
                                    <span className="text-xs block text-white bg-red-400 p-1 px-1 rounded-t-md">Outgoing</span> {/* 80% opacity */}
                                    <div className="bg-red-200 px-2 py-.5 rounded-md min-w-[80px] flex items-center justify-center"> {/* 80% opacity */}
                                        <CurrencyDisplay amount={currentMonthTotals.outgoing} className="font-bold text-md" type="DEBIT" showFraction={false} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Line Chart Container - Now with Ref and Scroll Handler */}
                    <div
                        className="w-full relative"
                    >
                        {isLoading && chartData.length === 0 ? (
                            <div className="h-48 flex items-center justify-center text-muted-foreground w-screen"> {/* Placeholder */}
                                Loading chart...
                            </div>
                        ) : chartData.length > 1 ? (
                            <>
                                <div className="absolute -top-1 h-4 left-1/2 transform -translate-x-1/2 w-4 rounded-full border-4 border-gray-100 bg-gray-400 z-10 pointer-events-none"></div>
                                {/* Centered Vertical Indicator Line - ADDED HERE */}
                                <div className="absolute top-0 bottom-0 mb-[26px] left-1/2 transform -translate-x-1/2 w-[2px] bg-gray-400 z-10 pointer-events-none"></div>
                                <CashFlowChart
                                    data={chartData.map(d => ({ // Map data to expected structure
                                        month: d.monthAbbr, // Use monthAbbr for the 'month' prop
                                        incoming: d.incoming,
                                        outgoing: d.outgoing,
                                        invested: d.invested,
                                        // Include year and numeric month if needed by chart internally
                                        // or for data attributes within the chart component itself
                                        year: d.year,
                                        numericMonth: d.month
                                    }))}
                                    selectedYear={selectedYear}
                                    selectedMonth={selectedMonth}
                                    isLoading={isLoading}
                                    className=""
                                    onMonthSelect={handleMonthSelect}
                                />
                            </>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-muted-foreground w-screen"> {/* Placeholder */}
                                No chart data available for this range.
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CashFlowDetailsScreen; 