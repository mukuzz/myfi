import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { FiSliders, FiCalendar, FiCheck, FiX } from 'react-icons/fi'; // Added FiCheck, FiX
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchTransactionsForMonth, fetchTransactionRange } from '../store/slices/transactionsSlice';
import { fetchTags } from '../store/slices/tagsSlice';
import { Transaction, Tag } from '../types';
import CurrencyDisplay from '../components/AmountDisplay';
import DraggableBottomSheet from '../components/DraggableBottomSheet'; // Import the bottom sheet
import ScreenContainer from '../components/ScreenContainer';
import TransactionList from '../components/TransactionList'; // Import TransactionList

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
    // --- NEW State for Transaction List Sheet ---
    const [isTransactionListOpen, setIsTransactionListOpen] = useState(false);
    const [selectedTagForList, setSelectedTagForList] = useState<string | null>(null);
    // --- End Transaction List Sheet State ---

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
    }, [dispatch, selectedMonth, selectedYear, availableMonths]);

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
            // Filter by specific month and year
            filteredTransactions = transactions.filter(tx => {
                const txDate = new Date(tx.transactionDate);
                // Compare year and 1-indexed month
                return txDate.getFullYear() === selectedYear && (txDate.getMonth() + 1) === selectedMonthValue;
            });
        } else if (selectedMonth === 'All Months') {
            // Filter only by year when 'All Months' is selected
             filteredTransactions = transactions.filter(tx => {
                const txDate = new Date(tx.transactionDate);
                return txDate.getFullYear() === selectedYear;
            });
        } // If neither condition is met (e.g., initial load or error), use all transactions (though this shouldn't happen with default state)

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
        // Reset temporary filters to current selection when opening - No longer needed
        // setFilterMonth(selectedMonth);
        // setFilterYear(selectedYear);
        setIsMonthFilterOpen(true);
    };

    const handleMonthSelect = (monthName: string) => {
        // Update main state directly
        setSelectedMonth(monthName);

        // Apply filter logic immediately
        const monthObject = availableMonths.find(m => m.name === monthName);
        const monthValue = monthObject?.value;

        if (monthName === 'All Months') {
            // Dispatch fetchTransactionRange for the entire selected year
            dispatch(fetchTransactionRange({ 
                startYear: selectedYear, 
                startMonth: 1, 
                endYear: selectedYear, 
                endMonth: 12 
            }));
        } else if (monthValue && monthValue !== 0) { // Ensure a specific month is selected
            dispatch(fetchTransactionsForMonth({ year: selectedYear, month: monthValue }));
        } else {
            console.warn("Invalid month selection or value");
        }

        // Optionally close the sheet immediately on selection
        // setIsMonthFilterOpen(false);
    };

    // --- New handler for year selection ---
    const handleYearSelect = (year: number) => {
        // Update main state directly
        setSelectedYear(year);

        // Apply filter logic immediately
        const monthObject = availableMonths.find(m => m.name === selectedMonth);
        const monthValue = monthObject?.value;

        if (selectedMonth === 'All Months') {
            // If 'All Months' is selected, fetch the range for the new year
            dispatch(fetchTransactionRange({ 
                startYear: year, 
                startMonth: 1, 
                endYear: year, 
                endMonth: 12 
            }));
        } else if (monthValue && monthValue !== 0) { // Ensure a specific month is selected
            // Fetch specific month for the newly selected year
            dispatch(fetchTransactionsForMonth({ year: year, month: monthValue }));
        } else {
            // This case might not be relevant if a month is always selected, but kept for safety
            console.warn("No valid month selected for filtering when changing year");
        }

        // Optionally close the sheet immediately on selection
        // setIsMonthFilterOpen(false);
    };
    // --- End new handler ---

    // --- NEW: Helper to get all descendant IDs --- Recursive helper
    const getAllDescendantIds = useCallback((
        tagId: number | null,
        childTagMap: Map<number | null, number[]>
    ): number[] => {
        if (tagId === null || !childTagMap.has(tagId)) return []; // Base case: no children or null tag

        const directChildren = childTagMap.get(tagId) || [];
        let allDescendants: number[] = [...directChildren];

        directChildren.forEach(childId => {
            allDescendants = allDescendants.concat(getAllDescendantIds(childId, childTagMap));
        });

        return allDescendants;
    }, []); // No dependencies needed as it's a pure function based on args

    // --- NEW: Filtered Transactions for Selected Tag --- 
    const transactionsForSelectedTag = useMemo((): Transaction[] => {
        if (!selectedTagForList || transactionsStatus !== 'succeeded' || tagsStatus !== 'succeeded') {
            return [];
        }

        // Reuse logic from spendingByTag to build maps (can be optimized later if needed)
        const tagMap = new Map<number, string>();
        const childTagMap = new Map<number | null, number[]>();
        tags.forEach((tag: Tag) => {
            if (tag.id !== undefined) {
                tagMap.set(tag.id, tag.name);
                const parentId = tag.parentTagId ?? null;
                if (!childTagMap.has(parentId)) {
                    childTagMap.set(parentId, []);
                }
                childTagMap.get(parentId)?.push(tag.id);
            }
        });
        tagMap.set(0, "Untagged"); // Add "Untagged" pseudo-tag

        // Find the ID of the selected tag name
        let clickedTagId: number | null = null;
        if (selectedTagForList === "Untagged") {
            clickedTagId = 0;
        } else {
            const foundTag = tags.find(tag => tag.name === selectedTagForList);
            if (foundTag && foundTag.id !== undefined) {
                clickedTagId = foundTag.id;
            } else {
                console.warn(`Tag ID not found for name: ${selectedTagForList}`);
                return []; // Tag not found, return empty
            }
        }

        // Get all descendant IDs using the helper
        const descendantIds = getAllDescendantIds(clickedTagId, childTagMap);
        const relevantTagIds = new Set<number | null>([clickedTagId, ...descendantIds]);

        // Filter transactions based on selected month/year (same as spendingByTag)
        const selectedMonthObject = availableMonths.find(m => m.name === selectedMonth);
        const selectedMonthValue = selectedMonthObject?.value;

        let dateFilteredTransactions = transactions;
        if (selectedMonthValue && selectedMonthValue !== 0) {
            dateFilteredTransactions = transactions.filter(tx => {
                const txDate = new Date(tx.transactionDate);
                return txDate.getFullYear() === selectedYear && (txDate.getMonth() + 1) === selectedMonthValue;
            });
        } else if (selectedMonth === 'All Months') {
            dateFilteredTransactions = transactions.filter(tx => {
                const txDate = new Date(tx.transactionDate);
                return txDate.getFullYear() === selectedYear;
            });
        }

        // Filter by relevant tag IDs
        const finalFilteredTransactions = dateFilteredTransactions.filter(tx => {
            const tagId = tx.tagId ?? 0; // Treat null tagId as 0 ("Untagged")
            return relevantTagIds.has(tagId);
        });

        // Transactions are already sorted by date in the slice
        return finalFilteredTransactions;

    }, [selectedTagForList, transactions, tags, transactionsStatus, tagsStatus, selectedMonth, selectedYear, availableMonths, getAllDescendantIds]);

    // --- NEW: Click Handler for Tag Item ---
    const handleTagItemClick = (tagName: string) => {
        setSelectedTagForList(tagName);
        setIsTransactionListOpen(true);
    };

    // --- NEW: Close Handler for Transaction List Sheet ---
    const closeTransactionListSheet = () => {
        setIsTransactionListOpen(false);
        setSelectedTagForList(null); // Clear selection on close
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
                    {!isLoading && spendingByTag.length === 0 && (
                        <p className="text-muted-foreground text-center pt-10">No spending data for this period.</p>
                    )}
                    {!isLoading && spendingByTag.map((item, index) => {
                        const percentage = totalSpending > 0 ? ((item.amount / totalSpending) * 100).toFixed(1) : '0.0';
                        const barWidthPercentage = totalSpending > 0 ? (item.amount / totalSpending) * 100 : 0;
                        return (
                            <div
                                key={index}
                                className="flex bg-card p-4 rounded-xl overflow-hidden shadow-sm relative bg-input border-[1px] border-input cursor-pointer"
                                onClick={() => handleTagItemClick(item.name)} // Added onClick handler
                            >
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
                <div className="flex flex-col h-full px-4 py-4">

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
                                        className={`w-full flex justify-between items-center p-3 rounded-lg text-left ${selectedMonth === month.name ? 'bg-muted' : 'hover:bg-muted/50' // Use selectedMonth
                                            }`}
                                    >
                                        <span className="text-sm font-medium text-foreground">{month.name}</span>
                                        {/* Custom Radio Button */}
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMonth === month.name ? 'border-primary bg-primary' : 'border-muted-foreground' // Use selectedMonth
                                            }`}>
                                            {selectedMonth === month.name && <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>}
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
                                        className={`w-full flex justify-between items-center p-3 rounded-lg text-left ${selectedYear === year ? 'bg-muted' : 'hover:bg-muted/50' // Use selectedYear
                                            }`}
                                    >
                                        <span className="text-sm font-medium text-foreground">{year}</span>
                                        {/* Custom Radio Button */}
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedYear === year ? 'border-primary bg-primary' : 'border-muted-foreground' // Use selectedYear
                                            }`}>
                                            {selectedYear === year && <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>}
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

             {/* Transaction List Bottom Sheet */} 
             <DraggableBottomSheet
                isOpen={isTransactionListOpen}
                onClose={closeTransactionListSheet}
                title={`${selectedTagForList || ''}`}
             >
                {/* Pass filtered transactions to TransactionList */} 
                <TransactionList
                    transactions={transactionsForSelectedTag}
                />
            </DraggableBottomSheet>

        </ScreenContainer>
    );
};

export default SpendingSummaryScreen; 