import React, { useState, useEffect, useCallback } from 'react';
import { FiCreditCard } from 'react-icons/fi';
import { LuPackageOpen } from 'react-icons/lu'; // Icon for split into following
import { Transaction, TagMap } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { splitTransactionApi, fetchTransactionById } from '../services/apiService';

interface SplitTransactionViewProps {
    transaction: Transaction; 
    tagMap: TagMap;
    onClose: () => void;
    refetchData: () => void;
    // Add other necessary props like onTagClick for sub-tx, onSplitFurther etc. later
    // onTagClickSubTransaction?: (subTx: Transaction, event: React.MouseEvent) => void;
    // onSplitFurther?: (parentTx: Transaction) => void;
}

// Helper function to format date as "Day, Mon. D 'YY" e.g., "Wed, Apr. 2 '25"
const formatHeaderDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'short', // e.g., Wed
        month: 'short',   // e.g., Apr
        day: 'numeric',   // e.g., 2
        year: '2-digit',  // e.g., '25
    };
    // Replace dots if necessary, ensure the format matches exactly
    return new Intl.DateTimeFormat('en-US', options).format(date).replace(/,/g, ''); // Example format, adjust as needed
};


const SplitTransactionView: React.FC<SplitTransactionViewProps> = ({
    transaction: initialTransaction,
    tagMap,
    onClose,
    refetchData,
    // onTagClickSubTransaction,
    // onSplitFurther
}) => {
    const [displayTransaction, setDisplayTransaction] = useState<Transaction | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isSplitting, setIsSplitting] = useState(false);
    const [splitError, setSplitError] = useState<string | null>(null);

    // Function to determine which transaction to fetch/display
    const loadDisplayTransaction = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        setSplitError(null); // Clear previous split errors on load
        try {
            if (initialTransaction.parentId) {
                // If the passed transaction is a child, fetch its parent
                console.log(`Initial transaction has parentId ${initialTransaction.parentId}, fetching parent...`);
                const parentData = await fetchTransactionById(initialTransaction.parentId);
                setDisplayTransaction(parentData);
            } else {
                // If the passed transaction has no parent, display it directly
                console.log(`Initial transaction has no parentId, using it directly.`);
                setDisplayTransaction(initialTransaction);
            }
        } catch (err: any) {
            console.error("Failed to load transaction details for split view:", err);
            setFetchError(err.message || "Failed to load transaction details.");
            setDisplayTransaction(null); // Ensure no stale data is shown on error
        } finally {
            setIsLoading(false);
        }
    }, [initialTransaction]); // Depend on the initialTransaction prop object

    // Load data on mount and when initialTransaction prop changes
    useEffect(() => {
        loadDisplayTransaction();
    }, [loadDisplayTransaction]);

    // Function to refetch details after an update
    const refetchDetails = () => {
        loadDisplayTransaction(); // Reload based on the initial prop logic
    };

    const handleSplit = async () => {
        // Always operate on the displayTransaction
        if (!displayTransaction || !displayTransaction.id) {
            setSplitError("Transaction data not loaded or missing ID.");
            return;
        }

        // Prevent splitting if the displayed transaction is itself a child
        if (displayTransaction.parentId) {
             setSplitError("Cannot split a transaction that is already a child/part of a split.");
             return;
        }

        setIsSplitting(true);
        setSplitError(null);

        const originalAmount = displayTransaction.amount;
        const splitAmount1 = originalAmount / 2;
        const splitAmount2 = originalAmount - splitAmount1;

        try {
            // Call API with the ID of the transaction being displayed
            await splitTransactionApi(displayTransaction.id, splitAmount1, splitAmount2);
            console.log('Transaction split successfully via API!');

            // Refetch the details for this view (will fetch parent if needed)
            refetchDetails();

            // Refetch the main transaction list
            refetchData();

        } catch (err: any) {
            console.error("Failed to split transaction via API:", err);
            setSplitError(err.message || "Failed to split transaction. Please try again.");
        } finally {
            setIsSplitting(false);
        }
    };

    // --- Loading and Error States --- 
    if (isLoading) {
        return <div className="p-4 text-center text-muted-foreground">Loading details...</div>;
    }

    if (fetchError) {
        return <div className="p-4 text-center text-red-500">Error: {fetchError}</div>;
    }

    // Use displayTransaction for rendering
    if (!displayTransaction) {
        return <div className="p-4 text-center text-muted-foreground">Transaction details not available.</div>;
    }
    // --- End Loading and Error States ---

    // Subtransactions are from the displayTransaction
    const subTransactions = displayTransaction.subTransactions || [];

    return (
        <div className="p-4 pt-0 flex flex-col h-full text-foreground bg-background">
            {/* Header like TransactionDetailView */}
            <div className="flex justify-between items-center pt-6 mb-4 flex-shrink-0 px-4">
                {/* Back button or close icon simulation */}
                <button onClick={onClose} className="text-foreground hover:text-muted-foreground" disabled={isSplitting}>
                     {/* Using a simple X for now, replace with actual back arrow if needed */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h2 className="text-lg font-semibold text-foreground">Split Details</h2>
                <div className="w-6 h-6"></div> {/* Spacer */}
            </div>

            {/* Original Transaction Summary Card */}
            <div className="bg-card rounded-lg shadow p-4 mb-6 mx-4 flex-shrink-0">
                <div className="text-center mb-3">
                    <span className="text-3xl font-bold text-foreground"> {/* Assuming negative amount */}
                        - {formatCurrency(displayTransaction.amount)}
                    </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground border-t border-border pt-3">
                    <div className="flex flex-col items-start">
                        <span className="text-xs uppercase mb-1">From</span>
                        <div className="flex items-center text-foreground">
                            <FiCreditCard className="mr-2 h-4 w-4 text-primary" /> {/* Use appropriate icon */}
                            {/* Display masked account number or name */}
                            <span>{displayTransaction.account?.name || 'Account'}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                         <span className="text-xs uppercase mb-1">On</span>
                         <span className="text-foreground">{formatHeaderDate(displayTransaction.transactionDate)}</span>
                    </div>
                </div>
            </div>

            {/* "Split Into" Section Header */}
            <div className="flex items-center justify-center text-xs uppercase text-muted-foreground mb-3 mx-4">
                <LuPackageOpen className="mr-2 h-4 w-4" />
                Split into the following
            </div>

             {/* List of Sub-Transactions */}
            <div className="flex-grow overflow-y-auto thin-scrollbar space-y-2 px-4">
                {subTransactions.length > 0 ? (
                    subTransactions.map((subTx) => (
                        <div key={subTx.id} className="bg-card rounded-lg p-3">
                            {/* Simplified Sub-Transaction Display */}
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-foreground">{subTx.description || 'Sub Transaction'}</span>
                                <span className="text-xs text-muted-foreground">{formatDate(subTx.transactionDate, true)}</span> {/* Assuming formatDate exists */}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-foreground">{formatCurrency(subTx.amount)}</span>
                                {/* Tag Chip (Make clickable later) */}
                                <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground cursor-pointer hover:bg-muted">
                                    {/* Add icon if needed */}
                                    {tagMap[subTx.tagId || -1]?.name || 'Untagged'}
                                </div>
                                {/* Add other icons/indicators based on image (exclude, bank logo?) */}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground text-sm py-4">
                        {isSplitting ? 'Splitting transaction...' : (displayTransaction.parentId ? 'Cannot split a child transaction.' : 'No sub-transactions found. Click below to split.')}
                    </p>
                )}
                {splitError && <p className="text-center text-red-500 text-sm py-2">Error: {splitError}</p>}
            </div>

            {/* Split Button Area */}
            <div className="p-4 mt-auto flex-shrink-0">
                <button
                    onClick={handleSplit}
                    disabled={isLoading || isSplitting || !!displayTransaction.parentId}
                    className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSplitting
                        ? 'Splitting...'
                        : displayTransaction.parentId
                        ? "Cannot split further (Child)"
                        : "Split Transaction"}
                </button>
            </div>

        </div>
    );
};

export default SplitTransactionView; 