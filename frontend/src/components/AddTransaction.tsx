import React, { useState, useEffect } from 'react';
import { FiSearch, FiDelete, FiPlus, FiMinus } from 'react-icons/fi'; // Remove FiX
import { Tag, TagMap } from '../types'; // Import TagMap

// Remove local definition
// type TagMap = { [id: number]: Tag }; 

interface AddTransactionProps {
    onClose: () => void;
    availableTags: Tag[];
    tagMap: TagMap; // Keep TagMap here
    // Add a function prop to handle the actual creation logic
    // onCreateTransaction: (data: NewTransactionData) => Promise<void>; 
}

// Define the shape of the data for a new transaction
interface NewTransactionData {
    description: string; // Renamed from name
    amount: number;
    transactionDate: string; // Or Date object
    tagId: number | null;
    type: 'CREDIT' | 'DEBIT'; // Add transaction type
}

const AddTransaction: React.FC<AddTransactionProps> = ({ 
    onClose, 
    availableTags, 
    tagMap,
    // onCreateTransaction 
}) => {
    const [description, setDescription] = useState('');
    const [amountString, setAmountString] = useState('0'); // Store amount as string for input
    const [transactionDate, setTransactionDate] = useState(new Date()); // Use Date object
    const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
    const [transactionType, setTransactionType] = useState<'DEBIT' | 'CREDIT'>('DEBIT'); // Default to Debit (-)
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // State for potentially opening a tag selector modal
    const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false); 
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [isVisible, setIsVisible] = useState(false); // State to control initial fade-in

    // Trigger fade-in effect on mount
    useEffect(() => {
        // Use timeout to allow initial render with opacity-0
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 10); // Small delay to trigger transition
        return () => clearTimeout(timer);
    }, []);

    // Wrapper for onClose to handle exit animation
    const handleClose = () => {
        setIsAnimatingOut(true);
        setTimeout(() => {
            onClose(); // Call original onClose after animation
        }, 300); // Match animation duration
    };

    const handleNumpadClick = (value: string) => {
        setError(null); // Clear error on new input
        if (amountString.includes('.') && value === '.') return; // Only one decimal point
        if (amountString === '0' && value !== '.') {
            setAmountString(value); // Replace leading zero unless it's a decimal
        } else {
            // Limit decimal places (e.g., to 2)
            const parts = amountString.split('.');
            if (parts.length > 1 && parts[1].length >= 2 && value !== 'backspace') {
                return; 
            }
            setAmountString(prev => prev + value);
        }
    };

    const handleBackspace = () => {
        setError(null);
        setAmountString(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    };

    const toggleTransactionType = () => {
        setTransactionType(prev => prev === 'DEBIT' ? 'CREDIT' : 'DEBIT');
    };

    const formatDisplayAmount = () => {
        const sign = transactionType === 'DEBIT' ? '-' : '+';
        // Basic formatting, consider using Intl.NumberFormat for better currency handling
        return `${sign}₹${parseFloat(amountString).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; 
    };

    const formatDate = (date: Date) => {
        // Simple date formatting, can be enhanced
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        }
        // Add more formatting logic for other dates if needed
        return date.toLocaleDateString(); 
    };

    const handleSubmit = async () => {
        setError(null);
        const finalAmount = parseFloat(amountString);

        if (!description) {
            setError("Please enter a description (Paid to?).");
            return;
        }
        if (finalAmount <= 0) {
             setError("Amount must be greater than zero.");
             return;
        }

        const transactionData: NewTransactionData = {
            description,
            amount: finalAmount,
            transactionDate: transactionDate.toISOString(), // Send ISO string to backend
            tagId: selectedTagId,
            type: transactionType,
        };

        setIsSubmitting(true);
        try {
            console.log("Submitting:", transactionData); // Placeholder
            // await onCreateTransaction(transactionData);
            handleClose(); // Use the new close handler on success
        } catch (err) {
            console.error("Failed to create transaction:", err);
            setError("Failed to add transaction. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const numpadLayout = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['.', '0', 'backspace']
    ];

    const animationDuration = 'duration-300'; // Define duration for consistency

    return (
        // Modal Backdrop & Aligning Container - Add backdrop blur
        <div 
            className={`fixed inset-0 flex items-end justify-center z-50 transition-opacity ${animationDuration} ease-in ${isVisible && !isAnimatingOut ? 'bg-black/50 opacity-100 backdrop-blur-sm' : 'bg-black/0 opacity-0'} px-4 pb-10`}
            onClick={handleClose} // Use handleClose for backdrop click
        >
            {/* Modal Content Area - Animate slide from bottom + expand using translate-y, scale, and origin-bottom */}
            <div 
                className={`bg-background text-foreground rounded-lg shadow-2xl w-full max-w-sm overflow-hidden flex flex-col origin-bottom transition-all ${animationDuration} ease-in-out ${isVisible && !isAnimatingOut ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[200px] scale-50'}`}
                onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking inside modal
            > 
                {/* Removed Close Button */}

                {/* Top Input Area */} 
                <div className="p-4 pt-6 flex-shrink-0"> {/* Adjust padding */}
                    {error && <p className="text-red-500 text-center mb-2 text-sm">{error}</p>}
                    <div className="flex justify-between items-center mb-3 space-x-2">
                         <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Paid to?"
                            className="flex-grow bg-transparent border border-dashed border-muted-foreground rounded px-2 py-1 text-sm placeholder-muted-foreground focus:outline-none focus:border-primary"
                        />
                         {/* Basic Date Display - Consider a Date Picker Component */}
                         <button className="border border-dashed border-muted-foreground rounded px-2 py-1 text-sm text-muted-foreground"> 
                            {formatDate(transactionDate)}
                        </button>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className={`text-3xl font-semibold ${transactionType === 'DEBIT' ? 'text-red-500' : 'text-green-500'}`}> {/* Slightly smaller text */}
                            {formatDisplayAmount()}
                        </span>
                        <button 
                            // onClick={() => setIsTagSelectorOpen(true)} // Open tag selector modal
                            className="flex items-center space-x-1 border border-input rounded-full px-3 py-1 text-sm bg-secondary hover:bg-muted"
                        >
                             <FiSearch size={14} className="text-muted-foreground"/> 
                            <span>{selectedTagId ? tagMap[selectedTagId]?.name : 'TAG'}</span> 
                        </button>
                    </div>
                </div>

                {/* Numpad Area */} 
                {/* Keep Numpad and Action buttons within the modal content */}
                <div className="flex-shrink-0 p-2 border-t border-border"> {/* Add border */}
                     {/* Type Toggle (+/-) */}
                     <div className="grid grid-cols-2 gap-2 mb-2">
                         <button 
                             onClick={transactionType === 'DEBIT' ? toggleTransactionType : undefined}
                             className={`py-3 rounded-lg text-xl font-semibold flex items-center justify-center ${transactionType === 'CREDIT' ? 'bg-green-500/20 text-green-600' : 'bg-secondary hover:bg-muted'}`} // Adjust padding/size
                         >
                             <FiPlus />
                         </button>
                         <button 
                             onClick={transactionType === 'CREDIT' ? toggleTransactionType : undefined}
                             className={`py-3 rounded-lg text-xl font-semibold flex items-center justify-center ${transactionType === 'DEBIT' ? 'bg-red-500/90 text-white' : 'bg-secondary hover:bg-muted'}`} // Adjust padding/size
                         >
                             <FiMinus />
                         </button>
                     </div>

                    {/* Numpad */} 
                    <div className="grid grid-cols-3 gap-2">
                        {numpadLayout.flat().map((key) => (
                            <button
                                key={key}
                                onClick={() => key === 'backspace' ? handleBackspace() : handleNumpadClick(key)}
                                className="py-3 rounded-lg text-xl font-semibold bg-secondary hover:bg-muted flex items-center justify-center" // Adjust padding/size
                            >
                                {key === 'backspace' ? <FiDelete /> : key}
                            </button>
                        ))}
                    </div>

                    {/* Action Buttons */} 
                    <div className="grid grid-cols-2 gap-2 mt-2">
                         <button 
                            onClick={handleClose} // Use the new close handler
                            className="py-2.5 rounded-lg bg-secondary hover:bg-muted text-foreground font-semibold"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            className="py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50"
                            disabled={isSubmitting || parseFloat(amountString) <= 0 || !description}
                        >
                            {isSubmitting ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </div>

                {/* Removed Optional Tag Selector Modal/Sheet section as it's less relevant in this direct component */}
            </div>
        </div>
    );
};

export default AddTransaction;