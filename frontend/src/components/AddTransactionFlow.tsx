import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useAppDispatch } from '../store/hooks';
import { createTransaction } from '../store/slices/transactionsSlice';
import { Transaction, Account, TagMap, Tag } from '../types';
import AmountInputModal from './AmountInputModal';
import AccountSelectionModal from './AccountSelectionModal';

interface AddTransactionFlowProps {
    accounts: Account[];
    tags: Tag[];
    tagMap: TagMap;
}

function AddTransactionFlow({ accounts, tags, tagMap }: AddTransactionFlowProps) {
    const dispatch = useAppDispatch();

    const [isAddTxSheetOpen, setIsAddTxSheetOpen] = useState<boolean>(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
    const [isAccountSelectorOpen, setIsAccountSelectorOpen] = useState<boolean>(false);

    const handleAddTransactionClick = () => {
        const newTransaction: Transaction = {
            id: 0, // Placeholder ID, backend will assign actual ID
            amount: 0,
            description: '',
            type: 'DEBIT', // Default type, can be changed in modal
            transactionDate: new Date().toISOString(),
            createdAt: new Date().toISOString(), // Placeholder, backend will set this
            excludeFromAccounting: false,
            account: null, // Account will be selected later
        };
        setTransactionToEdit(newTransaction);
        setIsAddTxSheetOpen(true);
        setIsAccountSelectorOpen(false); // Ensure account selector is closed initially
    };

    const closeAddTxSheet = () => {
        setIsAddTxSheetOpen(false);
    };

     const closeAccountSelector = () => {
        setIsAccountSelectorOpen(false);
    };

    const handleTransactionSubmit = async (transactionPayload: Transaction) => {
        // Store the payload from the amount modal
        setTransactionToEdit(transactionPayload);
        // Close the amount modal and open the account selector
        setIsAddTxSheetOpen(false);
        setIsAccountSelectorOpen(true);
    };

     const handleAccountSelected = async (selectedAccount: Account | null) => {
        if (!transactionToEdit) {
            console.error("No transaction data available to create.");
            setIsAccountSelectorOpen(false);
            return;
        }

        const { ...createData } = transactionToEdit; // Use the data stored from the amount modal

        // Prepare the final payload for the thunk
        const payloadForThunk: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>> = {
            ...createData,
            account: selectedAccount, // Assign the selected account (or null for cash)
            isManualEntry: true,
            // Provide a default description if none was entered
            description: createData.description || `MANUAL/${createData.type}/${new Date(createData.transactionDate).toLocaleDateString()} ${new Date(createData.transactionDate).toLocaleTimeString()}`
        };

        try {
            // Dispatch the createTransaction action
            await dispatch(createTransaction({ transactionData: payloadForThunk })).unwrap();
            console.log("Transaction created successfully via Redux.");
        } catch (err) {
            console.error("Failed to submit transaction via Redux:", err);
            // Handle error appropriately, maybe show a notification to the user
        } finally {
            // Close the account selector modal regardless of success or failure
            setIsAccountSelectorOpen(false);
            setTransactionToEdit(null); // Clear the state
        }
    };


    return (
        <>
            <button
                className="text-muted-foreground hover:text-foreground p-2"
                onClick={handleAddTransactionClick}
            >
                <FiPlus size={24} />
            </button>

            {accounts && (
                 <AccountSelectionModal
                    isOpen={isAccountSelectorOpen}
                    onClose={closeAccountSelector}
                    onSelectAccount={handleAccountSelected}
                    accounts={accounts}
                />
            )}

            {isAddTxSheetOpen && transactionToEdit && (
                <AmountInputModal
                    // Using a key ensures the modal resets if the target account changes,
                    // though for adding new transactions, it might not be strictly necessary here.
                    // Consider if a different key strategy is needed based on behavior.
                    key={transactionToEdit.id || 'new'} 
                    onClose={closeAddTxSheet}
                    transaction={transactionToEdit}
                    availableTags={tags}
                    tagMap={tagMap}
                    onSubmitTransaction={handleTransactionSubmit}
                />
            )}
        </>
    );
}

export default AddTransactionFlow; 