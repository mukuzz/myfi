import React, { useState, useMemo } from 'react';
import { FiFilter, FiPlus, FiSearch } from 'react-icons/fi';
import { Transaction, Account, TagMap, Tag } from '../types';
import { groupTransactionsByMonth } from '../utils/transactionUtils';
import TagSelector from './TagSelector';
import { useTransactionData } from '../hooks/useTransactionData';
import TransactionCard from './TransactionCard';
import DraggableBottomSheet from './DraggableBottomSheet';
import TransactionDetailView from './TransactionDetailView';
import AmountInputModal from './AmountInputModal';
import SplitTransactionView from './SplitTransactionView';
import { createTransaction } from '../services/apiService';


function Transactions() {
  const {
    transactions,
    tags,
    tagMap,
    loading,
    error,
    updateTransactionTag,
    refetchData,
    // createTransaction, // Ensure this exists and handles a Transaction object
    // accounts // Assume accounts are available from the hook, e.g., accounts[0]
  } = useTransactionData();

  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState<boolean>(false);
  const [selectedTransactionForTag, setSelectedTransactionForTag] = useState<Transaction | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState<boolean>(false);
  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<Transaction | null>(null);
  const [isAddTxSheetOpen, setIsAddTxSheetOpen] = useState<boolean>(false);
  const [isSplitViewOpen, setIsSplitViewOpen] = useState<boolean>(false);
  const [selectedTransactionForSplit, setSelectedTransactionForSplit] = useState<Transaction | null>(null);

  // State to hold the transaction being added/edited
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  const groupedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return {};
    return groupTransactionsByMonth(transactions);
  }, [transactions]);

  const openTagSelector = (tx: Transaction, event: React.MouseEvent) => {
    event.stopPropagation();
    closeDetailView();
    setSelectedTransactionForTag(tx);
    setIsTagSelectorOpen(true);
  };

  const closeTagSelector = () => {
    setIsTagSelectorOpen(false);
    setSelectedTransactionForTag(null);
  };

  const handleUpdateTag = async (newTagId: number | null) => {
    if (!selectedTransactionForTag) return;
    await updateTransactionTag(selectedTransactionForTag, newTagId);
  };

  const openDetailView = (tx: Transaction) => {
    setSelectedTransactionForDetail(tx);
    setIsDetailViewOpen(true);
  };

  const closeDetailView = () => {
    setIsDetailViewOpen(false);
    setSelectedTransactionForDetail(null);
  };

  const openSplitView = (tx: Transaction) => {
    closeDetailView();
    setSelectedTransactionForSplit(tx);
    setIsSplitViewOpen(true);
  };

  const closeSplitView = () => {
    setIsSplitViewOpen(false);
    setSelectedTransactionForSplit(null);
  };

  const openAddTxSheet = () => {
    // Create a new dummy transaction object when adding
    // IMPORTANT: Replace DUMMY_DEFAULT_ACCOUNT with a real account
    const newTransaction: Transaction = {
      id: -1, // Use a temporary ID like -1 for new transactions
      amount: 0,
      description: '',
      type: 'DEBIT', // Default type
      transactionDate: new Date().toISOString(),
      createdAt: new Date().toISOString(), // Set createdAt for new
      excludeFromAccounting: false, // Default value
    };
    setTransactionToEdit(newTransaction);
    setIsAddTxSheetOpen(true);
  };

  const closeAddTxSheet = () => {
    setIsAddTxSheetOpen(false);
    setTransactionToEdit(null); // Clear the transaction being edited
  };

  // It now receives the full updated transaction object
  const handleTransactionSubmit = async (transactionPayload: Transaction) => {
    console.log("Submitting transaction:", transactionPayload);

    try {
      // Format the date using browser's timezone
      const date = new Date(transactionPayload.transactionDate);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString();
      transactionPayload.description = `CASH/${transactionPayload.type}/${formattedDate} ${formattedTime}`;
      console.log("Calling createTransaction with data:", transactionPayload);
      await createTransaction(transactionPayload); // API service expects accountId in payload
      console.log("Transaction created successfully for:", transactionPayload.description);

      await refetchData(); // Refetch data on success
      // The AmountInputModal should close itself upon successful submission resolve.

    } catch (err) {
      console.error("Failed to submit transaction from Transactions component:", err);
      // Re-throw the error so the AmountInputModal can catch it and display an error message
      throw err;
    }
  };

  return (
    <div className="text-foreground flex flex-col h-full bg-muted">
      <div className="bg-secondary pt-4 border-b border-border">
        <div className="flex justify-between items-start mb-4 px-2">
          <h1 className="text-3xl font-bold pl-2">Transactions</h1>
          <div className="flex">
            <button className="text-muted-foreground hover:text-foreground p-2"><FiFilter size={20} /></button>
            <button
              className="text-muted-foreground hover:text-foreground p-2"
              onClick={openAddTxSheet} // Calls the function to create dummy tx
            >
              <FiPlus size={24} />
            </button>
          </div>
        </div>

        <div className="relative mb-4 px-4">
          <FiSearch className="absolute left-6 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transactions"
            className="w-full bg-input border border-input rounded-lg pl-8 pr-4 py-1 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary"
          />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto thin-scrollbar px-2 py-2">
        {loading && <p className="text-center text-muted-foreground">Loading transactions...</p>}
        {error && <p className="text-center text-error">Error: {error}</p>}
        {!loading && !error && transactions.length === 0 && <p className="text-center text-muted-foreground">No transactions found.</p>}

        {!loading && !error && transactions.length > 0 && (
          <div className="space-y-4">
            {Object.entries(groupedTransactions)
              .sort(([dateA], [dateB]) => new Date(groupedTransactions[dateB][0].transactionDate).getTime() - new Date(groupedTransactions[dateA][0].transactionDate).getTime())
              .map(([monthYear, txs]) => (
                <div key={monthYear}>
                  <div className="flex justify-between items-center mb-2 px-2">
                    <h2 className="text-lg font-semibold text-foreground">{monthYear}</h2>
                    <span className="text-xs text-muted-foreground">{txs.length} transaction{txs.length !== 1 ? 's' : ''}</span>
                  </div>
                  <ul className="space-y-2 px-2">
                    {txs.filter(tx => !tx.parentId).map(tx => (
                      <li key={tx.id} className="rounded-lg">
                        <div>
                          <TransactionCard
                            transaction={tx}
                            tagMap={tagMap}
                            onCardClick={openDetailView}
                            onTagClick={openTagSelector}
                          />
                          {tx.subTransactions && tx.subTransactions.length > 0 && (
                            <>
                              {tx.subTransactions.map(childTx => (
                                <>
                                <div className="border-t-[8px] mx-3 border-dashed border-secondary space-y-2"></div>
                                <TransactionCard
                                  key={childTx.id}
                                  transaction={childTx}
                                  tagMap={tagMap}
                                  onCardClick={openDetailView}
                                  onTagClick={openTagSelector}
                                />
                                </>
                              ))}
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        )}
      </div>

      {isAddTxSheetOpen && transactionToEdit && (
        <AmountInputModal
          onClose={closeAddTxSheet}
          transaction={transactionToEdit}
          availableTags={tags}
          tagMap={tagMap}
          onSubmitTransaction={handleTransactionSubmit}
        />
      )}

      <DraggableBottomSheet isOpen={isDetailViewOpen} onClose={closeDetailView}>
        {selectedTransactionForDetail && (
          <TransactionDetailView
            transaction={selectedTransactionForDetail}
            tagMap={tagMap}
            onTagClick={openTagSelector}
            onManageSplit={openSplitView}
          />
        )}
      </DraggableBottomSheet>

      <DraggableBottomSheet isOpen={isTagSelectorOpen} onClose={closeTagSelector}>
        <TagSelector
          onSelectTag={handleUpdateTag}
          availableTags={tags}
          tagMap={tagMap}
          currentTagId={selectedTransactionForTag?.tagId}
          transaction={selectedTransactionForTag ?? undefined}
        />
      </DraggableBottomSheet>

      <DraggableBottomSheet isOpen={isSplitViewOpen} onClose={closeSplitView}>
        {selectedTransactionForSplit && (
          <SplitTransactionView
            transaction={selectedTransactionForSplit}
            tagMap={tagMap}
            onClose={closeSplitView}
            refetchData={refetchData}
          />
        )}
      </DraggableBottomSheet>

    </div>
  );
}

export default Transactions; 