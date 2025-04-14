import React, { useState, useEffect, useMemo } from 'react';
import { FiCreditCard } from 'react-icons/fi';
import { LuPackageOpen } from 'react-icons/lu'; // Icon for split into following
import { Transaction, TagMap } from '../types';
import { formatCurrency } from '../utils/formatters';
import { useAppDispatch, useAppSelector } from '../store/hooks'; // Import Redux hooks
import { splitTransaction, resetMutationStatus, mergeTransaction } from '../store/slices/transactionsSlice'; // Import Redux action
import TransactionCard from './TransactionCard';
import AmountInputModal from './AmountInputModal';

interface SplitTransactionViewProps {
    transaction: Transaction; // The initial transaction passed (could be parent or child)
    tagMap: TagMap;
    onClose: () => void;
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
}) => {
    const dispatch = useAppDispatch();
    const { transactions, mutationStatus, mutationError } = useAppSelector((state) => state.transactions);

    // State for the input modal
    const [isSplitInputOpen, setIsSplitInputOpen] = useState(false);

    // Determine the transaction to display (always the parent)
    const displayTransaction = useMemo(() => {
        const targetId = initialTransaction.parentId ?? initialTransaction.id;
        // Find the most up-to-date version from the store
        return transactions.find(tx => tx.id === targetId) || null;
    }, [initialTransaction, transactions]);

    // --- Effect to handle mutation status changes --- 
    useEffect(() => {
        if (mutationStatus === 'succeeded' && isSplitInputOpen) {
            // If split succeeded while the modal was open, close the modal
            setIsSplitInputOpen(false);
            // Optionally: dispatch resetMutationStatus here or rely on onClose
        }
        // We don't automatically close the main view on success, only the input modal
    }, [mutationStatus, isSplitInputOpen]);

    // --- Effect to reset mutation status on close --- 
    useEffect(() => {
        return () => {
            // Reset status when the component unmounts (view is closed)
            dispatch(resetMutationStatus());
        };
    }, [dispatch]);

    // Function to open the split amount input modal
    const handleOpenSplitInput = () => {
        if (displayTransaction && !displayTransaction.parentId) {
            dispatch(resetMutationStatus()); // Clear previous errors before opening
            setIsSplitInputOpen(true);
        } else {
            // This case should ideally not happen if button is disabled correctly
            console.warn("Attempted to open split input for a child transaction.");
        }
    };

    // Function to handle the submission from the AddTransaction modal (in split mode)
    const handleSplitAmountSubmit = async (updatedTransaction: Transaction) => {
        if (!displayTransaction || !displayTransaction.id || displayTransaction.parentId) {
            console.error("Invalid state for splitting.");
            // Error should be shown via mutationError from slice if dispatch fails
            return;
        }

        const splitAmount1 = updatedTransaction.amount;
        const originalAmount = displayTransaction.amount;
        const splitAmount2 = parseFloat((originalAmount - splitAmount1).toFixed(2));

        // Basic validation (already done in modal, but good to double-check)
        if (splitAmount1 <= 0 || splitAmount2 <= 0) {
             console.error("Split amounts must be positive and less than the original.");
             // Rely on modal validation, but log error just in case
             // The slice will update mutationError if the dispatch fails server-side validation
            return;
        }

        try {
            console.log(`Dispatching split action for Tx ID ${displayTransaction.id} with amounts: ${splitAmount1}, ${splitAmount2}`);
            await dispatch(splitTransaction({
                transactionId: displayTransaction.id,
                amount1: splitAmount1,
                amount2: splitAmount2,
            })).unwrap(); // unwrap to catch rejection here

            console.log('Transaction split successfully via Redux.');
            // No need to manually update displayTransaction, it comes from useMemo -> Redux state
            // No need to call refetchData, slice update handles it
            // Modal closure is handled by useEffect watching mutationStatus

        } catch (err: any) { // Catch rejection from unwrap()
            console.error("Failed to dispatch split transaction via Redux:", err);
            // Error state (mutationError) is automatically set by the slice's rejected case
            // Keep the modal open so the user sees the error (mutationError will be displayed below)
        }
        // No finally block needed as loading state comes from mutationStatus
    };

    // Calculate total original amount (parent + children) using the derived displayTransaction
    const totalOriginalAmount = useMemo(() => {
        if (!displayTransaction) return 0;
        // If it's a parent, its amount is the remaining part. Sum with children from store.
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
    // Initial loading is removed - assuming transaction is already in the store
    // We rely on displayTransaction being found or not

    if (!displayTransaction) {
        // This might happen briefly if the store hasn't updated yet, or if the ID is invalid
        return (
            <div className="p-4 text-center text-muted-foreground">
                Loading transaction details or transaction not found...
            </div>
        );
    }
    // --- End Loading and Error States ---

    const isSplitting = mutationStatus === 'loading';
    const isMerging = mutationStatus === 'loading'; // Reuse for now
    const canSplit = !displayTransaction.parentId; // Only parent transactions can be split further

    // Custom close handler for the modal to reset Redux state
    const handleCloseSplitInput = () => {
        setIsSplitInputOpen(false);
        dispatch(resetMutationStatus()); // Clear API errors when modal is closed manually
    };

    // --- Merge Handler ---
    const handleMergeClick = async (childTransaction: Transaction) => {
        if (!childTransaction.id || !childTransaction.parentId) {
            console.error("Invalid transaction provided for merge.");
            return;
        }

        // Simple confirmation dialog
        const confirmation = window.confirm(
            `Are you sure you want to merge this transaction (Amount: ${formatCurrency(childTransaction.amount)}) back into its parent?`
        );

        if (confirmation) {
            dispatch(resetMutationStatus()); // Clear previous errors
            try {
                console.log(`Dispatching merge action for Child Tx ID ${childTransaction.id}`);
                await dispatch(mergeTransaction(childTransaction.id)).unwrap();
                console.log("Transaction merged successfully via Redux.");
                // State updates automatically via Redux store changes -> re-render
                // Potentially close the view if the parent becomes the only transaction?
                // Or maybe update the view title/state if needed.

            } catch (err: any) {
                console.error("Failed to dispatch merge transaction via Redux:", err);
                // Error state (mutationError) is automatically set by the slice's rejected case
                // Error will be displayed below the list
            }
        }
    };
    // --- End Merge Handler ---

    return (
        <>
            <div className="pt-0 flex flex-col h-full text-foreground">

                {/* Original Transaction Summary Card */}
                <div className="bg-secondary rounded-lg shadow p-4 mb-6 mx-4 flex-shrink-0">
                    <div className="text-center mb-3">
                        <span className="text-3xl font-bold text-foreground">
                            - {formatCurrency(totalOriginalAmount)}
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
                    {combinedTransactions.length == 1 ? 'Transaction is not split' : 'Split into the following'}
                </div>

                {/* List and Button Wrapper */}
                <div className="bg-input rounded-xl py-4 flex flex-col overflow-hidden mb-4 mx-4 overflow-y-auto ">
                    {/* List of transactions (Parent + Children) */}
                    <div className="thin-scrollbar space-y-2 mb-4">
                        {combinedTransactions.length > 0 ? (
                            combinedTransactions.map((tx, index) => {
                                const isParent = tx.id === displayTransaction.id;
                                const showDivider = isParent && combinedTransactions.length > 1 && index > 0;
                                return (
                                    <React.Fragment key={tx.id}>
                                        {showDivider && (
                                            <div className="border-t-4 border-dashed border-muted my-2 mx-4"></div>
                                        )}
                                        <div className='mx-4'>
                                            <TransactionCard
                                                transaction={tx}
                                                tagMap={tagMap}
                                                // Pass merge handler only for child transactions
                                                onMergeClick={tx.parentId ? handleMergeClick : undefined}
                                                // Other handlers might be needed depending on card usage
                                            />
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <p className="text-center text-muted-foreground text-sm py-4">
                                No split details to display.
                            </p>
                        )}
                        {/* Display Redux mutation errors here */}
                        {mutationStatus === 'failed' && mutationError && (
                            <p className="text-center text-red-500 text-sm py-2 px-4">
                                {/* Display merge errors as well */}
                                Error: {mutationError}
                            </p>
                        )}
                    </div>

                    {/* Split Button Area */}
                    <div className="flex-shrink-0 px-4">
                         {canSplit && (
                            <button
                                onClick={handleOpenSplitInput}
                                disabled={isSplitting} // Disable based on Redux mutation status
                                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {combinedTransactions.length == 1 ? 'Split Transaction' : isSplitting ? 'Processing Split...' : "Split Further"}
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
                {isSplitInputOpen && displayTransaction && (
                    <AmountInputModal
                        transaction={displayTransaction}
                        onSubmitTransaction={handleSplitAmountSubmit}
                        onClose={handleCloseSplitInput} // Use custom handler to reset Redux state
                        tagMap={tagMap}
                        availableTags={Object.values(tagMap || {})}
                        mode="split" // Set mode to split
                        maxAmount={displayTransaction.amount} // Pass the remaining parent amount as max
                    />
                )}
            </div>
        </>
    );
};

export default SplitTransactionView; 