import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiCreditCard } from 'react-icons/fi';
import { LuPackageOpen } from 'react-icons/lu'; // Icon for split into following
import { Transaction, TagMap } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { splitTransactionApi, fetchTransactionById } from '../services/apiService';
import TransactionCard from './TransactionCard';
import AmountInputModal from './AmountInputModal'; // Import the new generic modal

interface SplitTransactionViewProps {
    transaction: Transaction;
    tagMap: TagMap;
    onClose: () => void;
    refetchData: () => void;
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
}) => {
    const [displayTransaction, setDisplayTransaction] = useState<Transaction | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isSplitting, setIsSplitting] = useState(false); // Keep for overall splitting process indication
    const [splitError, setSplitError] = useState<string | null>(null);
    const [isSplitInputOpen, setIsSplitInputOpen] = useState(false); // State for the input modal

    // Function to determine which transaction to fetch/display
    const loadDisplayTransaction = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        setSplitError(null); 
        try {
            // Fetch full details even if it's the initial transaction (to get potential subTransactions)
            const fullData = await fetchTransactionById(initialTransaction.parentId ? initialTransaction.parentId : initialTransaction.id);
            setDisplayTransaction(fullData);

        } catch (err: any) {
            console.error("Failed to load transaction details for split view:", err);
            setFetchError(err.message || "Failed to load transaction details.");
            setDisplayTransaction(null); 
        } finally {
            setIsLoading(false);
        }
    }, [initialTransaction]);

    // Load data on mount and when initialTransaction prop changes
    useEffect(() => {
        loadDisplayTransaction();
    }, [loadDisplayTransaction]);

    // Function to open the split amount input modal
    const handleOpenSplitInput = () => {
        if (displayTransaction && !displayTransaction.parentId) {
             setSplitError(null); // Clear previous errors
             setIsSplitInputOpen(true);
        } else {
             setSplitError("Cannot split a transaction that is already a child/part of a split.");
        }
    };

    // Function to handle the submission from the AddTransaction modal (in split mode)
    const handleSplitAmountSubmit = async (splitAmount1: number) => {
        if (!displayTransaction || !displayTransaction.id || displayTransaction.parentId) {
            console.error("Invalid state for splitting.");
            setSplitError("Cannot split this transaction.");
            // Avoid closing modal here if state is invalid before API call
            return;
        }

        setIsSplitting(true); // Indicate API call is in progress
        setSplitError(null); // Clear previous split errors before new attempt
        // We don't close the modal here - wait for API result

        const originalAmount = displayTransaction.amount;
        // Ensure splitAmount2 calculation handles potential floating point issues if necessary
        const splitAmount2 = parseFloat((originalAmount - splitAmount1).toFixed(2));

        // Basic validation (already done in modal, but good to double-check)
        if (splitAmount1 <= 0 || splitAmount2 <= 0) {
            setSplitError("Split amounts must be positive and less than the original.");
            setIsSplitting(false); // Stop loading indicator
            // Don't close modal on validation error, let AddTransaction show the error
            return;
        }

        try {
            console.log(`Calling split API for Tx ID ${displayTransaction.id} with amounts: ${splitAmount1}, ${splitAmount2}`);
            const updatedParentData = await splitTransactionApi(displayTransaction.id, splitAmount1, splitAmount2);
            console.log('Transaction split successfully via API!');

            // Update the local state directly with the response
            setDisplayTransaction(updatedParentData);

            // Refetch the main transaction list in the parent component
            refetchData();

            setIsSplitInputOpen(false); // Close modal ONLY on successful API call

        } catch (err: any) {
            console.error("Failed to split transaction via API:", err);
            setSplitError(err.message || "Failed to split transaction. Please try again.");
            // Do not close the modal on API error, display the error below or within AddTransaction
        } finally {
            setIsSplitting(false); // Finish splitting process indication
            // Note: We now close the modal ONLY on success, handled within the try block.
            // Error handling keeps the modal open for the user to see the error.
        }
    };

    // Calculate total original amount (parent + children)
    const totalOriginalAmount = useMemo(() => {
        if (!displayTransaction) return 0;
        // If it's a parent (no parentId), its amount is the "remaining" part. Sum with children.
        // If it's a child (has parentId), we fetch the parent, so displayTransaction should be the parent.
        const subTotal = displayTransaction.subTransactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
        return displayTransaction.amount + subTotal;
    }, [displayTransaction]);

    // Combine parent and sub-transactions for the list
    const combinedTransactions = useMemo(() => {
        if (!displayTransaction) return [];
        // Ensure parent is always last for rendering order
        const children = displayTransaction.subTransactions || [];
        const parent = { ...displayTransaction, subTransactions: undefined }; // Remove nested subs from parent copy
        return [...children, parent]; 
    }, [displayTransaction]);

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

    const canSplit = !displayTransaction.parentId; // Only parent transactions can be split further

    return (
        // Use a Portal or ensure AddTransaction renders above this view if z-index issues occur
        <> 
            <div className="pt-0 flex flex-col h-full text-foreground bg-muted">
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
                <div className="bg-secondary rounded-lg shadow p-4 mb-6 mx-4 flex-shrink-0">
                    <div className="text-center mb-3">
                        <span className="text-3xl font-bold text-foreground"> {/* Assuming negative amount */}
                            - {formatCurrency(totalOriginalAmount)} {/* Show total involved amount */}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground border-t border-border pt-3">
                        <div className="flex flex-col items-start">
                            <span className="text-xs uppercase mb-1">From</span>
                            <div className="flex items-center text-foreground">
                                <FiCreditCard className="mr-2 h-4 w-4 text-primary" /> 
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
                <div className="flex items-center justify-center text-xs uppercase text-muted-foreground mb-6 mx-4">
                    <LuPackageOpen className="mr-2 h-4 w-4" />
                    Split into the following
                </div>

                {/* List and Button Wrapper */}
                <div className="bg-input rounded-xl py-4 flex flex-col overflow-hidden mb-4 mx-4 overflow-y-auto ">
                    {/* List of transactions (Parent + Children) */}
                    <div className="thin-scrollbar space-y-2 mb-4">
                        {combinedTransactions.length > 0 ? (
                            combinedTransactions.map((tx, index) => {
                                const isParent = tx.id === displayTransaction.id;
                                // Only add divider if there are children and this is the parent item
                                const showDivider = isParent && combinedTransactions.length > 1 && index > 0; 
                                return (
                                    <React.Fragment key={tx.id}>
                                        {showDivider && (
                                            <div className="border-t-4 border-dashed border-muted my-2 mx-4"></div>
                                        )}
                                        {/* Use bg-card for TransactionCard background inside the secondary box */}
                                        <div className='mx-4'><TransactionCard
                                            transaction={tx}
                                            tagMap={tagMap}
                                        />
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <p className="text-center text-muted-foreground text-sm py-4">
                                No transaction details to display.
                            </p>
                        )}
                        {/* Display API split errors here (distinct from AddTransaction errors) */}
                        {splitError && <p className="text-center text-red-500 text-sm py-2 px-4">Error splitting: {splitError}</p>}
                    </div>

                    {/* Split Button Area */} 
                    <div className="flex-shrink-0 px-4">
                         {/* Show Split button only if the displayed transaction is not a child */}                         {canSplit && (
                            <button
                                onClick={handleOpenSplitInput} // Open the modal
                                disabled={isLoading || isSplitting} // Disable while loading parent/submitting split
                                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSplitting ? 'Processing Split...' : "Split Further"}
                            </button>
                         )}
                         {!canSplit && (
                             <p className="text-center text-muted-foreground text-sm py-2">
                                 This is part of a split and cannot be split further.
                             </p>
                         )}
                    </div>
                </div>

                {/* Conditionally render the generic AmountInputModal for split input */}            
                {/* {isSplitInputOpen && (
                    <AmountInputModal 
                        title="Enter Split Amount"
                        onSubmitTransaction={handleSplitAmountSubmit} // Pass the handler containing API logic
                        onClose={() => {
                            setIsSplitInputOpen(false);
                            setSplitError(null); // Clear API errors when modal is closed manually
                        }} 
                        // Optionally pass initialAmountString or contextDisplay if needed
                    />
                )} */}
            </div>
        </>
    );
};

export default SplitTransactionView; 