import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchTransactionRange } from '../store/slices/transactionsSlice';

import { Transaction } from '../types';
import CurrencyDisplay from '../components/AmountDisplay';
import { FiChevronRight } from 'react-icons/fi'; // Back and Fullscreen icons
import CashFlowChart from '../components/CashFlowChart'; // Import the new chart component
import DraggableBottomSheet from '../components/DraggableBottomSheet'; // Import the bottom sheet
import ScreenContainer from '../components/ScreenContainer';
import TransactionList from '../components/TransactionList'; // Added import
import CashFlowDetailsSkeleton from '../components/skeletons/CashFlowDetailsSkeleton'; // Import skeleton

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

// Helper function to get month name abbreviation
const getMonthAbbr = (month: number) => {
    return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'short' });
}

// Helper function to get full month name
const getMonthName = (year: number, month: number) => {
    return new Date(year, month - 1).toLocaleString('default', { month: 'long' });
}

// New helper functions checking Redux state
const doesMonthDataExistInStore = (
    availableMonths: { [year: string]: { [month: number]: boolean } },
    year: number,
    month: number
): boolean => {
    // Check if year exists and month is true
    return availableMonths[String(year)]?.[month] === true;
};

const CashFlowDetailsScreen: React.FC = () => {
    const dispatch = useAppDispatch();
    const { transactions, status, availableMonths } = useAppSelector((state) => state.transactions);
    const [showInitialSkeleton, setShowInitialSkeleton] = useState(true);

    // Get initial year/month from location state, fallback to current month/year
    // const initialState = location.state as { year: number; month: number } | undefined;
    const initialYear = new Date().getFullYear();
    const initialMonth = new Date().getMonth() + 1; // Ensure month is 1-indexed

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

        // Read current status directly here
        const currentStatus = status; // Get status from closure
        // Note: availableMonths is now selected directly via useAppSelector

        // Check and Fetch Range Data using the new store check
        if (!fetchInitiatedRef.current.range &&
            currentStatus !== 'loading' &&
            currentStatus !== 'loadingMore') {
            console.log(`EFFECT: Dispatching fetchTransactionRange for range: ${startYear}-${startMonth} to ${endYear}-${endMonth}`);
            dispatch(fetchTransactionRange({ startYear, startMonth, endYear, endMonth }));
            fetchInitiatedRef.current.range = true; // Mark as initiated for this range key
        }

        if (fetchInitiatedRef.current.range && status === 'succeeded') {
            setShowInitialSkeleton(false);
        }

        // Removed redundant previous month check

        // Dependencies: Only re-run when the core date definitions change, or if status changes.
        // availableMonths is included so the check re-evaluates when it updates.
    }, [dispatch, dataFetchDateRange, prevYear, prevMonth, status, availableMonths]); // Updated dependencies

    // Prepare data for the chart - use the wider fetch range
    const chartData = useMemo(() => {
        const data: { year: number; month: number; monthAbbr: string; incoming: number; outgoing: number; invested: number }[] = [];
        const { startYear, startMonth, endYear, endMonth } = dataFetchDateRange;

        let current = new Date(startYear, startMonth - 1, 1);
        const end = new Date(endYear, endMonth - 1, 1);

        // 1. Generate data for all available months in the range
        while (current <= end) {
            const year = current.getFullYear();
            const month = current.getMonth() + 1;
            if (doesMonthDataExistInStore(availableMonths, year, month)) {
                const totals = calculateTotals(transactions, year, month);
                data.push({
                    year: year,
                    month: month,
                    monthAbbr: getMonthAbbr(month),
                    incoming: totals.incoming,
                    outgoing: totals.outgoing,
                    invested: totals.invested,
                });
            }
            current.setMonth(current.getMonth() + 1);
        }

        // 2. Find the index of the first month with any non-zero total
        const firstMonthWithActivityIndex = data.findIndex(d =>
            d.incoming > 0 || d.outgoing > 0 || d.invested > 0
        );
        

        // 3. If a month with activity is found, slice the array from that index onwards
        if (firstMonthWithActivityIndex !== -1) {
            return data.slice(firstMonthWithActivityIndex);
        } else {
            // 4. Otherwise, return an empty array (or potentially the last month if needed? For now, empty)
            return [];
        }


    }, [transactions, dataFetchDateRange, availableMonths]); // Depend on transactions for totals, and availableMonths/dataFetchDateRange for filtering

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

    // State for the bottom sheet
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [sheetTitle, setSheetTitle] = useState('');
    const [sheetTransactions, setSheetTransactions] = useState<Transaction[]>([]);

    // Function to filter transactions for the sheet
    const filterTransactionsForSheet = useCallback((type: 'Incoming' | 'Outgoing' | 'Investment') => {
        return transactions.filter(tx => {
            const txDate = new Date(tx.transactionDate);
            const isInSelectedMonth = txDate.getFullYear() === selectedYear && txDate.getMonth() === selectedMonth - 1;
            if (!isInSelectedMonth || tx.excludeFromAccounting) return false;

            if (type === 'Incoming') {
                return tx.type === 'CREDIT';
            } else if (type === 'Outgoing') {
                return tx.type === 'DEBIT'; // && !isInvestment(tx) // Add investment logic later
            } else if (type === 'Investment') {
                return false; // Placeholder for investment logic
                // return tx.type === 'DEBIT' && isInvestment(tx);
            }
            return false;
        });
    }, [transactions, selectedYear, selectedMonth]); // Dependencies

    // Function to open the sheet
    const handleOpenSheet = useCallback((type: 'Incoming' | 'Outgoing' | 'Investment') => {
        const filtered = filterTransactionsForSheet(type);
        setSheetTitle(`${type} Transactions`);
        setSheetTransactions(filtered);
        setIsSheetOpen(true);
        console.log(`Opening sheet for ${type} with ${filtered.length} transactions`);
    }, [filterTransactionsForSheet]); // Dependency

    // *** ADDED: Top-level loading check ***
    if (showInitialSkeleton || isLoading) {
        return (
            <ScreenContainer title="Cash Flow">
                <CashFlowDetailsSkeleton />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer title="Cash Flow">
            <div className="bg-card mb-4">
                {/* Top Section (Month, Percentages, Totals) */}
                <div className="flex justify-between items-start p-8 pb-0">
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

                <div className='flex h-[400px] flex-col justify-start pt-4'>

                    {/* Current Month Totals */}
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

                    {/* Line Chart Container - Now with Ref and Scroll Handler */}
                    <div
                        className="w-full relative"
                    >
                        {chartData.length > 1 ? (
                            <>
                                <div className="absolute -top-1 h-4 left-1/2 transform -translate-x-1/2 w-4 rounded-full border-4 border-gray-100 bg-gray-400 z-1 pointer-events-none"></div>
                                {/* Centered Vertical Indicator Line - ADDED HERE */}
                                <div className="absolute top-0 bottom-0 mb-[26px] left-1/2 transform -translate-x-1/2 w-[2px] bg-gray-400 z-1 pointer-events-none"></div>
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


            </div>

            {/* Updated Footer Section */}
            <div className=" bg-background p-4 pt-0 space-y-3 flex flex-col items-center">
                {/* Incoming Transactions Card */}
                <button
                    onClick={() => handleOpenSheet('Incoming')}
                    className="flex justify-between items-center max-w-md w-full p-3 bg-card rounded-lg border border-border"
                >
                    <div>
                        <p className="text-base font-semibold text-foreground">Incoming Transactions</p>
                        <p className="text-sm text-left text-muted-foreground">{getMonthName(selectedYear, selectedMonth)} {selectedYear}</p>
                    </div>
                    <FiChevronRight size={20} className="text-muted-foreground" />
                </button>

                {/* Outgoing Transactions Card */}
                <button
                    onClick={() => handleOpenSheet('Outgoing')}
                    className="flex justify-between items-center max-w-md w-full p-3 bg-card rounded-lg border border-border"

                >
                    <div>
                        <p className="text-base font-semibold text-foreground">Outgoing Transactions</p>
                        <p className="text-sm text-left text-muted-foreground">{getMonthName(selectedYear, selectedMonth)} {selectedYear}</p>
                    </div>
                    <FiChevronRight size={20} className="text-muted-foreground" />
                </button>

                {/* Investments Card */}
                <button
                    onClick={() => handleOpenSheet('Investment')}
                    className="flex justify-between items-center max-w-md w-full p-3 bg-card rounded-lg border border-border "
                >
                    <div>
                        <p className="text-base font-semibold text-foreground">Investments</p>
                        <p className="text-sm text-left text-muted-foreground">{getMonthName(selectedYear, selectedMonth)} {selectedYear}</p>
                    </div>
                    <FiChevronRight size={20} className="text-muted-foreground" />
                </button>
            </div>

            {/* Bottom Sheet */}
            <DraggableBottomSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                title={sheetTitle}
                zIndex={50} // Ensure it's above the footer buttons (z-30)
            >
                {sheetTransactions.length > 0 ? (
                    <TransactionList
                        transactions={sheetTransactions}
                    />
                ) : (
                    <p className="text-muted-foreground text-center py-4">No transactions found.</p>
                )}

            </DraggableBottomSheet>

        </ScreenContainer >
    );
};

export default CashFlowDetailsScreen; 