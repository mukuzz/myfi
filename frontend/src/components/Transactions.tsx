import React, { useState, useMemo } from 'react';
import { FiFilter, FiPlus, FiSearch } from 'react-icons/fi';
import { Transaction } from '../types';
import { groupTransactionsByMonth } from '../utils/transactionUtils';
import TagSelector from './TagSelector';
import { useTransactionData } from '../hooks/useTransactionData';
import TransactionCard from './TransactionCard';
import DraggableBottomSheet from './DraggableBottomSheet';
import TransactionDetailView from './TransactionDetailView';
import AddTransaction from './AddTransaction';
import SplitTransactionView from './SplitTransactionView';

function Transactions() {
  const {
    transactions,
    tags,
    tagMap,
    loading,
    error,
    updateTransactionTag,
    refetchData,
    // Assume createTransaction exists or will be added in the hook
    // createTransaction 
  } = useTransactionData();

  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState<boolean>(false);
  const [selectedTransactionForTag, setSelectedTransactionForTag] = useState<Transaction | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState<boolean>(false);
  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<Transaction | null>(null);
  const [isAddTxSheetOpen, setIsAddTxSheetOpen] = useState<boolean>(false);
  const [isSplitViewOpen, setIsSplitViewOpen] = useState<boolean>(false);
  const [selectedTransactionForSplit, setSelectedTransactionForSplit] = useState<Transaction | null>(null);

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
    setIsAddTxSheetOpen(true);
  };

  const closeAddTxSheet = () => {
    setIsAddTxSheetOpen(false);
    // Optionally refetch data after adding a transaction and closing the sheet
    // refetchData(); 
  };

  const handleCreateTransaction = async (data: any /* Replace any with NewTransactionData type */) => {
     console.log("Creating transaction with data:", data);
     // try {
     //   await createTransaction(data);
     //   refetchData(); // Refetch data on success
     //   closeAddTxSheet(); // Close sheet on success
     // } catch (err) {
     //   console.error("Failed to create transaction from component:", err);
     //   // Handle error display in the AddTransaction component itself
     //   throw err; // Re-throw to let the form know about the error
     // }
  };

  return (
    <div className="pt-4 text-foreground flex flex-col h-full bg-background">
      <div className="flex justify-between items-start mb-4 px-2">
        <h1 className="text-3xl font-bold pl-2">Transactions</h1>
        <div className="flex">
          <button className="text-muted-foreground hover:text-foreground p-2"><FiFilter size={20} /></button>
          <button 
            className="text-muted-foreground hover:text-foreground p-2"
            onClick={openAddTxSheet}
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
          className="w-full bg-secondary border border-input rounded-lg pl-8 pr-4 py-1 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary"
        />
      </div>

      <div className="flex-grow overflow-y-auto thin-scrollbar px-2 pb-4">
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
                    {txs.map(tx => (
                      <li 
                        key={tx.id} 
                        className="rounded-lg"
                      >
                        <TransactionCard 
                          transaction={tx} 
                          tagMap={tagMap} 
                          onCardClick={openDetailView}
                          onTagClick={openTagSelector}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Detail View Bottom Sheet (New) */}
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

      {/* Add Transaction Bottom Sheet */}
      {isAddTxSheetOpen && (
        <AddTransaction 
          onClose={closeAddTxSheet}
          availableTags={tags}
          tagMap={tagMap}
        />
      )}

      {/* Split Transaction Bottom Sheet (New) */}
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