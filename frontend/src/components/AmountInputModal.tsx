import React, { useState, useEffect, useMemo } from 'react';
import { FiDelete, FiPlus, FiMinus, FiTag } from 'react-icons/fi'; // Added FiTag
import { Transaction, Tag, TagMap } from '../types'; // Keep Transaction type
import { formatCurrency, formatDate as formatDateUtil } from '../utils/formatters';
import DraggableBottomSheet from './DraggableBottomSheet';
import TagSelector from './TagSelector';
import CurrencyDisplay from './AmountDisplay';


interface AmountInputModalProps {
    onClose: () => void;
    transaction: Transaction;
    onSubmitTransaction: (updatedTransaction: Transaction) => Promise<void>;
    tagMap: TagMap; // Add tagMap prop
    availableTags: Tag[]; // Add availableTags prop
    mode?: 'create' | 'split'; // Change from 'normal' to 'create'
    maxAmount?: number; // Add optional maxAmount for split mode
}

const AmountInputModal: React.FC<AmountInputModalProps> = ({
    onClose,
    transaction,
    onSubmitTransaction,
    tagMap, // Add tagMap parameter
    availableTags, // Add availableTags parameter
    mode = 'create', // Change default from 'normal' to 'create'
    maxAmount, // Add maxAmount parameter
}) => {
    // --- State ---
    // Initialize state based on the passed transaction object
    const [amountString, setAmountString] = useState(mode === 'split' ? '0' : transaction.amount > 0 ? String(transaction.amount) : '0');
    const [description, setDescription] = useState(transaction.description || '');
    // Ensure transactionDate is parsed correctly
    const initialDate = useMemo(() => {
        try {
            return transaction.transactionDate ? new Date(transaction.transactionDate) : new Date();
        } catch (e) {
            console.error("Error parsing initial date:", transaction.transactionDate, e);
            return new Date(); // Fallback to now
        }
    }, [transaction.transactionDate]);
    const [transactionDate, setTransactionDate] = useState<Date>(initialDate);
    const [selectedTagId, setSelectedTagId] = useState<number | undefined>(transaction.tagId === null ? undefined : transaction.tagId);
    const [transactionType, setTransactionType] = useState<'CREDIT' | 'DEBIT'>(transaction.type || 'DEBIT');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false); // New state for tag selector

    // Get tag name for display using the tagMap
    const tagName = useMemo(() => {
        if (selectedTagId !== undefined && selectedTagId !== null && tagMap && tagMap[selectedTagId]) {
            return tagMap[selectedTagId].name;
        }
        return 'TAG'; // Default if no tag selected
    }, [selectedTagId, tagMap]);

    // Calculate remaining amount for display in split mode
    const displayTransactionForSplitMode = useMemo(() => {
        if (mode !== 'split' || maxAmount === undefined) {
            return transaction; // Return original if not in split mode or no max amount
        }
        const enteredAmount = parseFloat(amountString);
        const remainingAmount = isNaN(enteredAmount) ? maxAmount : maxAmount - enteredAmount;
        // Return a copy of the transaction with the updated amount for display
        return {
            ...transaction,
            amount: Math.max(0, remainingAmount) // Ensure amount doesn't go below zero for display
        };
    }, [mode, maxAmount, amountString, transaction]);

    // --- Effects ---
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    // --- Handlers ---
    const handleClose = () => {
        setIsAnimatingOut(true);
        setTimeout(() => onClose(), 300);
    };

    const handleNumpadClick = (value: string) => {
        setError(null);
        if (amountString.includes('.') && value === '.') return;
        let nextAmountString = (amountString === '0' && value !== '.') ? value : amountString + value;
        const parts = nextAmountString.split('.');
        if (parts.length > 1 && parts[1].length > 2) return;
        const potentialAmount = parseFloat(nextAmountString);
        if (!isNaN(potentialAmount)) {
            if (potentialAmount > 999999999) return; // General large amount check
            // Add check for maxAmount in split mode
            if (mode === 'split' && maxAmount !== undefined && potentialAmount > maxAmount) {
                // Optionally set an error or just prevent update
                // setError(`Amount cannot exceed ${formatCurrency(maxAmount)}`);
                return; // Prevent exceeding max amount
            }
        }
        // transaction.amount = parseFloat(nextAmountString); // Removed: Mutates prop/state directly
        setAmountString(nextAmountString);
    };

    const handleBackspace = () => {
        setError(null);
        setAmountString(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    };

    const toggleTransactionType = () => {
        setTransactionType(prev => {
            let type: 'CREDIT' | 'DEBIT' = prev === 'DEBIT' ? 'CREDIT' : 'DEBIT';
            transaction.type = type;
            return type;
        });
    };

    // New handlers for tag selection
    const openTagSelector = () => {
        setIsTagSelectorOpen(true);
    };

    const closeTagSelector = () => {
        setIsTagSelectorOpen(false);
    };

    const handleSelectTag = (tagId: number | null) => {
        setSelectedTagId(tagId === null ? undefined : tagId);
        closeTagSelector();
        transaction.tagId = tagId;
    };

    const handleSubmit = async () => {
        setError(null);
        const finalAmount = parseFloat(amountString);

        if (finalAmount <= 0) {
            setError("Amount must be greater than zero.");
            return;
        }

        // Add validation for maxAmount in split mode
        if (mode === 'split' && maxAmount !== undefined && finalAmount >= maxAmount) {
             setError(`Split amount must be less than the remaining amount (${formatCurrency(maxAmount)}).`);
            return;
        }

        setIsSubmitting(true);
        try {
            // Create the updated transaction object based on current state
            const updatedTransaction: Transaction = {
                ...transaction, // Spread the original transaction to keep id, account, etc.
                amount: finalAmount,
                description: description,
                transactionDate: transactionDate.toISOString(),
                type: transactionType,
                tagId: selectedTagId, // Include the selected tag
                // Ensure required fields are present if they weren't on the dummy
                uniqueKey: transaction.uniqueKey || `new_${Date.now()}`, // Example placeholder
                excludeFromAccounting: transaction.excludeFromAccounting ?? false,
            };
            console.log("Submitting updated transaction:", updatedTransaction);
            await onSubmitTransaction(updatedTransaction);
            handleClose(); // Close modal on success
        } catch (err: any) {
            console.error("Failed to submit transaction:", err);
            setError("Failed to submit transaction. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render Logic ---
    const numpadLayout = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['.', '0', 'backspace']
    ];

    const animationDuration = 'duration-300';

    return (
        <>
            <div
                className={`fixed ${mode === 'split' ? 'rounded-t-xl' : ''} inset-0 flex flex-col items-center justify-center z-50 transition-opacity ${animationDuration} ease-in ${isVisible && !isAnimatingOut ? 'bg-black/50 opacity-100 backdrop-blur-sm' : 'bg-black/0 opacity-0'} px-4`}
                onClick={handleClose}
            >
                <div
                    className={`bg-secondary text-foreground rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col origin-bottom transition-all ${animationDuration} ease-in-out ${isVisible && !isAnimatingOut ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[200px] scale-50'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    
                    {/* Top Input Area */}
                    <div className="p-4 pt-6 flex-shrink-0">
                        {error && <p className="text-red-500 text-center mb-2 text-sm">{error}</p>}

                        {/* Show max amount hint in split mode */}
                        {mode === 'split' && maxAmount !== undefined && (
                            <div className="flex flex-row justify-center items-center mb-3">
                                <p className="text-xs text-muted-foreground text-center mr-2">Splitting from</p>
                                <CurrencyDisplay amount={maxAmount} showType={false} className="font-medium" />
                            </div>
                        )}

                        {/* Description & Date Input */}
                        <div className="flex justify-between items-center mb-3">
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => {
                                    setDescription(e.target.value);
                                    transaction.description = e.target.value;
                                }}
                                placeholder="Paid to?"
                                className="flex-grow min-w-0 bg-transparent border border-dashed border-muted-foreground rounded px-2 py-1 text-sm placeholder-muted-foreground focus:outline-none focus:border-primary mr-2"
                                disabled={isSubmitting}
                            />
                            {/* Date Button - Needs a way to select date */}
                            <button
                                className="border border-dashed border-muted-foreground rounded px-2 py-1 text-sm text-muted-foreground whitespace-nowrap"
                                disabled={isSubmitting}
                            >
                                <input
                                    type="date"
                                    value={transactionDate.toISOString().split('T')[0]}
                                    className="bg-transparent border-none focus:outline-none text-sm text-muted-foreground"
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        setTransactionDate(new Date(e.target.value));
                                        transaction.transactionDate = e.target.value;   
                                    }}
                                />
                            </button>
                        </div>

                        {/* Amount Display & Tag Button */}
                        <div className={`flex justify-between items-center mb-3`}>
                            <CurrencyDisplay 
                                amount={parseFloat(amountString) || 0} 
                                smallRupeeSymbol={true}
                                className="text-3xl font-semibold"
                                type={transactionType}
                            />
                            {/* Tag Button - Now opens TagSelector */}
                            <button
                                onClick={openTagSelector}
                                className="flex items-center space-x-1 border border-input rounded-full px-3 py-1 text-sm bg-secondary hover:bg-muted"
                            >
                                <FiTag size={14} className="text-muted-foreground" />
                                <span>{tagName}</span>
                            </button>
                        </div>
                    </div>

                    {/* Numpad Area */}
                    <div className="flex-shrink-0 p-3 border-t border-border">
                        {/* Type Toggle Buttons (+/-) - Only show in create mode */}
                        {mode === 'create' && (
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <button
                                    onClick={transactionType === 'DEBIT' ? toggleTransactionType : undefined}
                                    disabled={transactionType === 'CREDIT' || isSubmitting}
                                    className={`py-3 rounded-lg text-xl font-semibold flex items-center justify-center transition-colors duration-100 ease-in-out ${transactionType === 'CREDIT' ? 'bg-green-600 text-white' : 'bg-muted'} disabled:opacity-50`}
                                >
                                    <FiPlus />
                                </button>
                                <button
                                    onClick={transactionType === 'CREDIT' ? toggleTransactionType : undefined}
                                    disabled={transactionType === 'DEBIT' || isSubmitting}
                                    className={`py-3 rounded-lg text-xl font-semibold flex items-center justify-center transition-colors duration-100 ease-in-out ${transactionType === 'DEBIT' ? 'bg-red-600 text-white' : 'bg-muted'} disabled:opacity-50`}
                                >
                                    <FiMinus />
                                </button>
                            </div>
                        )}

                        {/* Numpad */}
                        <div className="grid grid-cols-3 gap-3">
                            {numpadLayout.flat().map((key) => (
                                <button
                                    key={key}
                                    onClick={() => key === 'backspace' ? handleBackspace() : handleNumpadClick(key)}
                                    className="py-3 rounded-lg text-xl font-semibold bg-muted flex items-center justify-center transition duration-100 ease-in-out transform active:scale-90 active:bg-muted/80"
                                    disabled={isSubmitting}
                                >
                                    {key === 'backspace' ? <FiDelete /> : key}
                                </button>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <button
                                onClick={handleClose}
                                className="py-2.5 rounded-lg bg-secondary hover:bg-muted text-foreground font-semibold border border-input"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50"
                                disabled={isSubmitting || parseFloat(amountString) <= 0}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit'} {/* Changed from Create to Submit */}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tag Selector with higher z-index (70) to appear above AmountInputModal (z-50) */}
            <DraggableBottomSheet 
                isOpen={isTagSelectorOpen} 
                onClose={closeTagSelector}
                zIndex={70}
                title="Tag Transaction"
            >
                <TagSelector
                    onSelectTag={handleSelectTag}
                    availableTags={availableTags}
                    tagMap={tagMap}
                    currentTagId={selectedTagId ?? undefined}
                    transaction={transaction}
                />
            </DraggableBottomSheet>
        </>
    );
};

export default AmountInputModal;