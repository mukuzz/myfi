import React, { useEffect, useMemo, useState } from 'react';
import { FiSliders, FiCalendar, FiCheck, FiX } from 'react-icons/fi'; // Added FiCheck, FiX
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchTransactionsForMonth } from '../store/slices/transactionsSlice';
import { fetchTags } from '../store/slices/tagsSlice';
import { Transaction, Tag } from '../types';
import CurrencyDisplay from '../components/AmountDisplay';
import DraggableBottomSheet from '../components/DraggableBottomSheet'; // Import the bottom sheet
import ScreenContainer from '../components/ScreenContainer';

interface TagSpending {
    name: string;
    amount: number;
}

const SpendingSummaryScreen: React.FC = () => {
    const dispatch = useAppDispatch();

    // --- State for Filters ---
    const [isMonthFilterOpen, setIsMonthFilterOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' }));
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    // --- State for temporary selections within the filter sheet ---
    const [filterMonth, setFilterMonth] = useState<string>(selectedMonth);
    const [filterYear, setFilterYear] = useState<number>(selectedYear);
    // --- End Temporary State ---

    const availableMonths = useMemo(() => {
        // TODO: Replace with dynamic logic based on available data/year
        // Represent months with names and their numeric value (1-indexed)
        return [
            { name: 'All Months', value: 0 }, // Use 0 or null for All Months
            { name: 'January', value: 1 },
            { name: 'February', value: 2 },
            { name: 'March', value: 3 },
            { name: 'April', value: 4 },
            { name: 'May', value: 5 },
            { name: 'June', value: 6 },
            { name: 'July', value: 7 },
            { name: 'August', value: 8 },
            { name: 'September', value: 9 },
            { name: 'October', value: 10 },
            { name: 'November', value: 11 },
            { name: 'December', value: 12 },
        ];
    }, []);

    // --- Available Years (Example: Can be made dynamic later) ---
    const availableYears = useMemo(() => {
        // TODO: Replace with dynamic logic based on available data
        return [2024, 2025];
    }, []);
    // --- End Available Years ---

    const {
        transactions, // Use main transactions list
        status: transactionsStatus, // Use main status
        error: transactionsError // Use main error
    } = useAppSelector((state) => state.transactions);
    const {
        tags,
        status: tagsStatus,
        error: tagsError
    } = useAppSelector((state) => state.tags);

    const isLoading = transactionsStatus === 'loading' || tagsStatus === 'loading';
    const error = transactionsError || tagsError;

    useEffect(() => {
        // Fetch data for the initially selected month/year if not loaded
        const initialMonthObject = availableMonths.find(m => m.name === selectedMonth);
        const initialMonthValue = initialMonthObject?.value;

        

        if ((transactionsStatus === 'idle' || transactionsStatus === 'failed') && initialMonthValue && initialMonthValue !== 0) {
            dispatch(fetchTransactionsForMonth({ year: selectedYear, month: initialMonthValue }));
        }
        if (tagsStatus === 'idle' || tagsStatus === 'failed') {
            dispatch(fetchTags());
        }
    }, [dispatch, transactionsStatus, tagsStatus, selectedMonth, selectedYear, availableMonths]);

    // --- Spending Calculation Logic (Adapted from SpendingSummary) ---
    const spendingByTag = useMemo((): TagSpending[] => {
        if (transactionsStatus !== 'succeeded' || tagsStatus !== 'succeeded') {
            return [];
        }

        // Filter transactions based on selected month/year
        const selectedMonthObject = availableMonths.find(m => m.name === selectedMonth);
        const selectedMonthValue = selectedMonthObject?.value; // 1-indexed month or 0 for 'All Months'

        let filteredTransactions = transactions;
        if (selectedMonthValue && selectedMonthValue !== 0) {
            filteredTransactions = transactions.filter(tx => {
                const txDate = new Date(tx.transactionDate);
                // Compare year and 1-indexed month
                return txDate.getFullYear() === selectedYear && (txDate.getMonth() + 1) === selectedMonthValue;
            });
        } // If selectedMonthValue is 0 ('All Months'), use all transactions

        const tagMap = new Map<number, string>();
        const tagParentMap = new Map<number, number | null>();
        const childTagMap = new Map<number | null, number[]>();

        tags.forEach((tag: Tag) => {
            if (tag.id !== undefined) {
                tagMap.set(tag.id, tag.name);
                const parentId = tag.parentTagId ?? null;
                tagParentMap.set(tag.id, parentId);
                if (!childTagMap.has(parentId)) {
                    childTagMap.set(parentId, []);
                }
                childTagMap.get(parentId)?.push(tag.id);
            }
        });
        tagMap.set(0, "Untagged");
        tagParentMap.set(0, null);

        const initialSpendingMap = new Map<number, number>();
        tagMap.forEach((_, tagId) => {
            initialSpendingMap.set(tagId, 0);
        });

        // Use the filtered transactions
        filteredTransactions.forEach((tx: Transaction) => {
            if (tx.type === 'DEBIT' && !tx.excludeFromAccounting) {
                const tagId = tx.tagId ?? 0;
                const currentAmount = initialSpendingMap.get(tagId) || 0;
                if (initialSpendingMap.has(tagId)) {
                    initialSpendingMap.set(tagId, currentAmount + tx.amount);
                }
            }
        });

        const memo = new Map<number, number>();
        const calculateTotalSpending = (tagId: number): number => {
            if (memo.has(tagId)) {
                return memo.get(tagId)!;
            }
            let total = initialSpendingMap.get(tagId) || 0;
            const children = childTagMap.get(tagId) || [];
            for (const childId of children) {
                total += calculateTotalSpending(childId);
            }
            memo.set(tagId, total);
            return total;
        };

        const aggregatedSpending: TagSpending[] = [];
        tagMap.forEach((name, tagId) => {
            const parentId = tagParentMap.get(tagId);
            // Include all top-level tags and the "Untagged" category
            if (parentId === null || tagId === 0) {
                const totalAmount = calculateTotalSpending(tagId);
                if (totalAmount > 0) { // Only include tags with spending
                    aggregatedSpending.push({ name, amount: totalAmount });
                }
            }
        });

        aggregatedSpending.sort((a, b) => b.amount - a.amount);

        return aggregatedSpending;

    }, [transactions, tags, transactionsStatus, tagsStatus, selectedMonth, selectedYear, availableMonths]);

    const totalSpending = useMemo(() => {
        return spendingByTag.reduce((sum, item) => sum + item.amount, 0);
    }, [spendingByTag]);

    const handleMonthButtonClick = () => {
        // Reset temporary filters to current selection when opening
        setFilterMonth(selectedMonth);
        setFilterYear(selectedYear);
        setIsMonthFilterOpen(true);
    };

    const handleMonthSelect = (month: string) => {
        setFilterMonth(month); // Update temporary filter month
        // Optionally close the sheet immediately on selection,
        // or wait for the checkmark confirmation.
        // setIsMonthFilterOpen(false); // Example: Close immediately
    };

    // --- New handler for year selection ---
    const handleYearSelect = (year: number) => {
        setFilterYear(year); // Update temporary filter year
    };
    // --- End new handler ---

    const handleFilterConfirm = () => {
        // Apply temporary selections to the main state
        setSelectedMonth(filterMonth);
        setSelectedYear(filterYear);

        const monthObject = availableMonths.find(m => m.name === filterMonth);
        const monthValue = monthObject?.value;

        if (monthValue && monthValue !== 0) { // Ensure a specific month is selected
            dispatch(fetchTransactionsForMonth({ year: filterYear, month: monthValue }));
        } else if (filterMonth === 'All Months') {
            // TODO: Handle "All Months" case - e.g., fetch all transactions for the selected year
            console.log(`Handle 'All Months' filter for year ${filterYear}`);
        } else {
            console.warn("No valid month selected for filtering");
        }

        setIsMonthFilterOpen(false);
    };

    const handleFilterReset = () => {
        // Reset temporary filters to current real month/year
        const currentRealMonth = new Date().getMonth() + 1; // JS month is 0-indexed
        const currentRealYear = new Date().getFullYear();
        const currentMonthName = availableMonths.find(m => m.value === currentRealMonth)?.name || 'All Months';

        setFilterMonth(currentMonthName);
        setFilterYear(currentRealYear);
        // Apply the reset immediately to the main state as well
        setSelectedMonth(currentMonthName);
        setSelectedYear(currentRealYear);

        // Re-fetch data based on the reset values
        if (currentMonthName !== 'All Months') {
             dispatch(fetchTransactionsForMonth({ year: currentRealYear, month: currentRealMonth }));
        } else {
            // Handle fetching for 'All Months' if needed after reset
            console.log(`Handle 'All Months' after reset for year ${currentRealYear}`);
        }

        console.log("Resetting filters to current month/year and applying");
        // We might keep the sheet open or close it on reset, depending on desired UX
        // setIsMonthFilterOpen(false);
    };

    // --- UI Rendering --- //
    return (
        <ScreenContainer title="Spending Summary">

            {/* Filters */}
            <div className="flex items-center justify-center p-4 space-x-2 flex-shrink-0">
                <div className="flex space-x-2">
                    <button 
                        onClick={handleMonthButtonClick} // Open sheet on click
                        className="flex items-center space-x-1 px-3 py-1.5 bg-muted rounded-lg text-sm"
                    >
                        <FiCalendar size={16} />
                        <span>{selectedYear}</span>
                    </button>
                    <button
                        onClick={handleMonthButtonClick} // Open sheet on click
                        className="flex items-center space-x-1 px-3 py-1.5 bg-muted rounded-lg text-sm"
                    >
                        <FiCalendar size={16} />
                        <span>{selectedMonth}</span>
                    </button>
                </div>
                <button 
                    onClick={handleMonthButtonClick} // Open sheet on click
                    className="p-2 bg-muted rounded-lg"
                >
                    <FiSliders size={18} />
                </button>
            </div>

            <div className='flex flex-col flex-grow overflow-y-auto'>

                {/* Spending List */}
                <div className="flex-grow p-4 space-y-3">
                    {isLoading && <p className="text-muted-foreground text-center pt-10">Loading...</p>}
                    {error && <p className="text-destructive text-center pt-10">Error: {error}</p>}
                    {!isLoading && !error && spendingByTag.length === 0 && (
                        <p className="text-muted-foreground text-center pt-10">No spending data for this period.</p>
                    )}
                    {!isLoading && !error && spendingByTag.map((item, index) => {
                        const percentage = totalSpending > 0 ? ((item.amount / totalSpending) * 100).toFixed(1) : '0.0';
                        const barWidthPercentage = totalSpending > 0 ? (item.amount / totalSpending) * 100 : 0;
                        return (
                            <div key={index} className="flex bg-card p-4 rounded-xl overflow-hidden shadow-sm relative bg-input border-[1px] border-input">
                                <div className="flex w-full justify-between items-end space-x-4" style={{ zIndex: 2 }}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-card-foreground">{item.name}</p>
                                        <CurrencyDisplay
                                            amount={item.amount}
                                            className="text-lg font-bold text-card-foreground"
                                            showType={false}
                                            showFraction={false}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                        {percentage}%
                                    </span>
                                </div>
                                <div
                                    className="absolute inset-y-0 left-0 bg-secondary rounded-r-xl border-input"
                                    style={{ width: `${barWidthPercentage}%`, zIndex: 1 }}
                                    aria-hidden="true"
                                ></div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Month Filter Bottom Sheet */}
            <DraggableBottomSheet
                isOpen={isMonthFilterOpen}
                onClose={() => setIsMonthFilterOpen(false)}
                title="Filter" // Add title to the sheet
            >
                <div className="flex flex-col h-full px-4 pb-4">
                    {/* Header inside Sheet */}
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <button
                            onClick={handleFilterReset}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-sm font-medium"
                        >
                            <FiX size={16} className="mr-1"/>
                            <span>Reset</span>
                        </button>
                        {/* Title is now handled by the DraggableBottomSheet prop */}
                        <button
                            onClick={handleFilterConfirm}
                            className="p-2 text-primary" // Use primary color for confirm
                        >
                            <FiCheck size={24} />
                        </button>
                    </div>

                    {/* Filter Content Area - Now uses Flexbox */}
                    <div className="flex-grow overflow-y-auto space-x-4 flex"> 
                        {/* Month Section */}
                        <div className="flex-1 space-y-4">
                            <h3 className="text-base font-semibold text-muted-foreground mb-2 px-1">Month</h3>
                            <div className="space-y-1">
                                {availableMonths.map((month) => (
                                    <button
                                        key={month.name}
                                        onClick={() => handleMonthSelect(month.name)}
                                        className={`w-full flex justify-between items-center p-3 rounded-lg text-left ${filterMonth === month.name ? 'bg-muted' : 'hover:bg-muted/50'
                                            }`}
                                    >
                                        <span className="text-sm font-medium text-foreground">{month.name}</span>
                                        {/* Custom Radio Button */}
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${filterMonth === month.name ? 'border-primary bg-primary' : 'border-muted-foreground'
                                            }`}>
                                            {filterMonth === month.name && <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Year Section - New */}
                        <div className="flex-1 space-y-4">
                            <h3 className="text-base font-semibold text-muted-foreground mb-2 px-1">Year</h3>
                            <div className="space-y-1">
                                {availableYears.map((year) => (
                                    <button
                                        key={year}
                                        onClick={() => handleYearSelect(year)}
                                        className={`w-full flex justify-between items-center p-3 rounded-lg text-left ${filterYear === year ? 'bg-muted' : 'hover:bg-muted/50'
                                            }`}
                                    >
                                        <span className="text-sm font-medium text-foreground">{year}</span>
                                        {/* Custom Radio Button */}
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${filterYear === year ? 'border-primary bg-primary' : 'border-muted-foreground'
                                            }`}>
                                            {filterYear === year && <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* End Year Section */}

                        {/* Add other filter sections here (e.g., Sort) */}
                    </div>
                </div>
            </DraggableBottomSheet>
        </ScreenContainer>
    );
};

export default SpendingSummaryScreen; 