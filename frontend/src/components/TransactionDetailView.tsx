import React, { useState, useEffect, useCallback } from 'react';
import { FiTag, FiCreditCard } from 'react-icons/fi'; // Example icons, Add FiSave
import { TbArrowsCross } from 'react-icons/tb'; // Import the icon
import { Transaction } from '../types';
import { getTagIcon } from '../utils/transactionUtils';
import TransactionDetailsCard from './TransactionDetailsCard';
import { updateTransaction } from '../services/apiService'; // Adjust the path as needed

// A simple debounce function (consider using lodash.debounce for production)
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        timeoutId = null;
        // Check if func exists and is callable before calling it
        if (typeof func === 'function') {
          resolve(func(...args));
        } else {
           console.error("Debounced function is not callable:", func);
           // Optionally reject the promise or handle the error appropriately
           // reject(new Error("Debounced function is not callable"));
        }
      }, waitFor);
    });
  };
};

interface TransactionDetailViewProps {
  transaction: Transaction;
  tagMap: Map<number, string>;
  // Placeholder functions for actions - implementation later
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  onSplit?: (transaction: Transaction) => void;
  onTagClick?: (transaction: Transaction, event: React.MouseEvent) => void;
  // Optional: Add account details if needed
  // account?: Account; // Assuming an Account type exists
}

function TransactionDetailView({
  transaction,
  tagMap,
  onEdit,
  onDelete,
  onSplit,
  onTagClick,
}: TransactionDetailViewProps) {
  const [isExcluded, setIsExcluded] = useState(transaction.excludeFromAccounting || false);
  const [note, setNote] = useState(transaction.notes || ''); // Use 'notes' based on model change
  const [isSaving, setIsSaving] = useState(false); // Optional: for loading state

  const currentTagName = transaction.tagId ? tagMap.get(transaction.tagId) : 'Untagged';
  const TagIconComponent = currentTagName !== 'Untagged' && transaction.tagId
    ? getTagIcon(currentTagName)
    : <FiTag className="text-muted-foreground" />;

  // Debounced function to save the note
  const debouncedSaveNote = useCallback(
    debounce(async (newNote: string) => {
      if (!transaction?.id) return; // Ensure transaction and id exist
      setIsSaving(true);
      console.log('Saving note:', newNote);
      transaction.notes = newNote;
      try {
        updateTransaction(transaction.id, { ...transaction });
        console.log('Note saved successfully');
      } catch (error) {
        console.error('Failed to save note:', error);
        // TODO: Add user feedback for save failure
      } finally {
        setIsSaving(false);
      }
    }, 500), // Debounce time: 500ms
    [transaction?.id, updateTransaction] // Dependencies for useCallback
  );

  const toggleExclude = async () => {
    const newExcludedValue = !isExcluded;
    setIsExcluded(newExcludedValue);
    
    // Save the changes to the server
    if (transaction?.id) {
      try {
        console.log('Updating excludeFromAccounting:', newExcludedValue);
        transaction.excludeFromAccounting = newExcludedValue;
        await updateTransaction(transaction.id, { ...transaction });
        console.log('excludeFromAccounting updated successfully');
      } catch (error) {
        console.error('Failed to update excludeFromAccounting:', error);
        // Optional: revert the UI state if the server update fails
        setIsExcluded(!newExcludedValue);
        // TODO: Add user feedback for save failure
      }
    } else {
      console.error('Cannot update excludeFromAccounting: transaction ID is missing');
    }
  };

  const handleNoteChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(event.target.value);
  };

  // Effect to save the note when it changes (debounced)
  useEffect(() => {
    // Only save if the note has actually changed from the initial transaction note
    if (note !== (transaction.notes || '')) { // Use 'notes' based on model change
       // Use optional chaining for safety
       debouncedSaveNote?.(note);
    }
  }, [note, transaction.notes, debouncedSaveNote]);

  // Basic structure - adjust styling and layout based on your image/design
  return (
    <div className="p-4 pt-0 flex flex-col h-full text-foreground bg-background"> {/* Changed bg to background */}

      <div className="flex justify-between items-center pt-6 mb-4 flex-shrink-0 px-4">
        <div className="w-6 h-6"></div>
        <h2 className="text-lg font-semibold text-foreground">Transaction Details</h2>
        <div className="w-6 h-6"></div>
      </div>
      {/* Header Section */}
      <div className="mb-6">
        <TransactionDetailsCard transaction={transaction} tagMap={tagMap} onTagClick={onTagClick}/>
      </div>

      {/* Account Chip Section */}
      {transaction.accountId && (
        <div className="flex justify-between mb-6 w-full px-4 bg-secondary rounded-xl p-2">
            Account
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-secondary-foreground">
            <FiCreditCard className="mr-2 h-4 w-4" />
            {transaction.accountId}
          </div>
        </div>
      )}

    {/* Note Section */}
    <div className="bg-muted px-2 py-4 rounded-lg flex flex-col mb-6">
        <label htmlFor="transaction-note" className="mb-0 px-2 text-sm font-medium text-foreground">
          Notes
        </label>
        <textarea
          id="transaction-note"
          className="w-full p-2 bg-muted text-foreground placeholder-muted-foreground mb-3 resize-none"
          placeholder="Add a note for this transaction..."
          value={note}
          onChange={handleNoteChange}
        />
      </div>

      {/* Exclude from Cash Flow Section */}
      <div className="bg-muted p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between bg-card p-3 rounded-md">
          <div className="flex items-center">
            <TbArrowsCross className="mr-3 h-5 w-5 text-foreground" />
            <span className="text-foreground font-medium">Exclude from Cash Flow</span>
          </div>
          {/* Simple Toggle Switch */}
          <button
            type="button"
            onClick={toggleExclude}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
              isExcluded ? 'bg-primary' : 'bg-input' // Use input color for off state
            }`}
          >
            <span className="sr-only">Toggle Exclude from Cash Flow</span>
            <span
              className={`inline-block w-4 h-4 transform bg-background rounded-full transition-transform duration-200 ease-in-out ${
                isExcluded ? 'translate-x-6' : 'translate-x-1' // Adjusted translate values
              }`}
            />
          </button>
        </div>
        <p className="text-muted-foreground text-sm mt-2 px-1">
          Turn this on if you don't want this expense to affect Cash Flow calculations.
        </p>
      </div>
      
    </div>
  );
}

export default TransactionDetailView; 