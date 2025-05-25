import React, { useState, useEffect, useRef } from 'react';
import { Transaction, TagMap, Tag } from '../types';
import SplitTransactionCard from './SplitTransactionCard';
import DraggableBottomSheet from './DraggableBottomSheet';
import TransactionDetailView from './TransactionDetailView';
import TagSelector from './TagSelector';
import SplitTransactionView from './SplitTransactionView';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateTransactionTag } from '../store/slices/transactionsSlice';
import { fetchTags, selectTagMap } from '../store/slices/tagsSlice';

const getMonthYear = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
};

interface TransactionListProps {
  transactions: Transaction[];
  className?: string;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  className
}) => {
  const dispatch = useAppDispatch();

  const { tags, status: tagsStatus, error: tagsError } = useAppSelector((state) => state.tags);
  const tagMap = useAppSelector(selectTagMap);

  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState<boolean>(false);
  const [selectedTransactionForTag, setSelectedTransactionForTag] = useState<Transaction | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState<boolean>(false);
  const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<Transaction | null>(null);
  const [isSplitViewOpen, setIsSplitViewOpen] = useState<boolean>(false);
  const [selectedTransactionForSplit, setSelectedTransactionForSplit] = useState<Transaction | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tagsStatus === 'idle') {
      dispatch(fetchTags());
    }
  }, [dispatch, tagsStatus]);

  let lastRenderedMonthYear: string | null = null;

  const closeTagSelector = () => {
    setIsTagSelectorOpen(false);
    setSelectedTransactionForTag(null);
  };

  const closeDetailView = () => {
    setIsDetailViewOpen(false);
    setSelectedTransactionForDetail(null);
  };

  const closeSplitView = () => {
    setIsSplitViewOpen(false);
    setSelectedTransactionForSplit(null);
  };

  const openTagSelector = (tx: Transaction, event: React.MouseEvent) => {
    event.stopPropagation();
    closeDetailView();
    setSelectedTransactionForTag(tx);
    setIsTagSelectorOpen(true);
  };

  const handleUpdateTag = async (newTagId: number | null) => {
    if (!selectedTransactionForTag) return;
    dispatch(updateTransactionTag({
      transactionId: selectedTransactionForTag.id,
      newTagId,
      originalTransaction: selectedTransactionForTag
    })).then(() => {
    }).catch((error: any) => {
      console.error("Failed to update tag via Redux:", error);
    });
  };

  const openDetailView = (tx: Transaction) => {
    setSelectedTransactionForDetail(tx);
    setIsDetailViewOpen(true);
  };

  const openSplitView = (tx: Transaction) => {
    closeDetailView();
    setSelectedTransactionForSplit(tx);
    setIsSplitViewOpen(true);
  };

  return (
    <div
      ref={scrollContainerRef}
      className={`px-2 pt-4 relative ${className}`}
      style={{ scrollbarWidth: 'none' }}
    >

      {transactions.length > 0 && (
        <ul className="space-y-2 p-2 pt-0">
          {transactions.map((tx) => {
            if (tx.parentId) return null;

            const currentMonthYear = getMonthYear(tx.transactionDate);
            const showMonthHeader = currentMonthYear !== lastRenderedMonthYear;
            if (showMonthHeader) {
              lastRenderedMonthYear = currentMonthYear;
            }

            return (
              <React.Fragment key={tx.id}>
                {showMonthHeader && (
                  <div className="flex justify-between items-center mb-2 px-1">
                    <h2 className="text-sm font-semibold text-muted-foreground">{currentMonthYear}</h2>
                  </div>
                )}
                <SplitTransactionCard
                  transaction={tx}
                  tagMap={tagMap}
                  openDetailView={openDetailView}
                  openTagSelector={openTagSelector}
                  openSplitView={openSplitView}
                />
              </React.Fragment>
            );
          })}
        </ul>
      )}

      <DraggableBottomSheet isOpen={isDetailViewOpen} onClose={closeDetailView} title="Transaction Details">
        {selectedTransactionForDetail && (
          <TransactionDetailView
            transaction={selectedTransactionForDetail}
            tagMap={tagMap}
            onTagClick={openTagSelector}
            onManageSplit={openSplitView}
            onClose={closeDetailView}
          />
        )}
      </DraggableBottomSheet>

      <DraggableBottomSheet isOpen={isTagSelectorOpen} onClose={closeTagSelector} title="Tag Transaction">
        <TagSelector
          onSelectTag={handleUpdateTag}
          availableTags={tags}
          tagMap={tagMap}
          currentTagId={selectedTransactionForTag?.tagId}
          transaction={selectedTransactionForTag ?? undefined}
        />
      </DraggableBottomSheet>

      <DraggableBottomSheet isOpen={isSplitViewOpen} onClose={closeSplitView} title="Split Details">
        {selectedTransactionForSplit && (
          <SplitTransactionView
            transaction={selectedTransactionForSplit}
            tagMap={tagMap}
            onClose={closeSplitView}
          />
        )}
      </DraggableBottomSheet>
    </div>
  );
};

export default TransactionList; 