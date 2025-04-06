import React, { useState, useMemo } from 'react';
import { FiFilter, FiPlus, FiSearch } from 'react-icons/fi';
import { Transaction } from '../types';
import { groupTransactionsByMonth } from '../utils/transactionUtils';
import TagSelector from './TagSelector';
import { useTransactionData } from '../hooks/useTransactionData';
import TransactionDetailsCard from './TransactionDetailsCard';
import DraggableBottomSheet from './DraggableBottomSheet';

function Transactions() {
  const {
    transactions,
    tags,
    tagMap,
    loading,
    error,
    updateTransactionTag,
    refetchData
  } = useTransactionData();

  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const groupedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return {};
    return groupTransactionsByMonth(transactions);
  }, [transactions]);

  const openTagSelector = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setIsTagSelectorOpen(true);
  };

  const closeTagSelector = () => {
    setIsTagSelectorOpen(false);
    setSelectedTransaction(null);
  };

  const handleUpdateTag = async (newTagId: number | null) => {
    if (!selectedTransaction) return;
    await updateTransactionTag(selectedTransaction, newTagId);
  };

  return (
    <div className="pl-4 pt-4 text-foreground flex flex-col h-full bg-background">
      <div className="flex justify-between items-center mb-4 pr-4">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <div className="flex space-x-3">
          <button className="text-muted-foreground hover:text-foreground"><FiFilter size={20} /></button>
          <button className="text-muted-foreground hover:text-foreground"><FiPlus size={24} /></button>
        </div>
      </div>

      <div className="relative mb-4 pr-4">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search transactions"
          className="w-full bg-secondary border border-input rounded-lg pl-10 pr-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary"
        />
      </div>

      <div className="flex-grow overflow-y-auto thin-scrollbar pr-4 pb-4">
        {loading && <p className="text-center text-muted-foreground">Loading transactions...</p>}
        {error && <p className="text-center text-error">Error: {error}</p>}
        {!loading && !error && transactions.length === 0 && <p className="text-center text-muted-foreground">No transactions found.</p>}

        {!loading && !error && transactions.length > 0 && (
          <div className="space-y-4">
            {Object.entries(groupedTransactions)
              .sort(([dateA], [dateB]) => new Date(groupedTransactions[dateB][0].transactionDate).getTime() - new Date(groupedTransactions[dateA][0].transactionDate).getTime())
              .map(([monthYear, txs]) => (
                <div key={monthYear}>
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold text-foreground">{monthYear}</h2>
                    <span className="text-xs text-muted-foreground">{txs.length} transaction{txs.length !== 1 ? 's' : ''}</span>
                  </div>
                  <ul className="space-y-2">
                    {txs.map(tx => (
                      <li 
                        key={tx.id} 
                        className="rounded-lg"
                      >
                        <TransactionDetailsCard 
                          transaction={tx} 
                          tagMap={tagMap} 
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

      <DraggableBottomSheet isOpen={isTagSelectorOpen} onClose={closeTagSelector}>
        <TagSelector 
          onSelectTag={handleUpdateTag}
          availableTags={tags}
          tagMap={tagMap}
          currentTagId={selectedTransaction?.tagId}
          transaction={selectedTransaction ?? undefined}
        />
      </DraggableBottomSheet>
    </div>
  );
}

export default Transactions; 