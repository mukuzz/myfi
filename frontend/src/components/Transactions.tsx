import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { FiFilter, FiSearch } from 'react-icons/fi';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
    fetchTransactions,
    updateTransactionTag
} from '../store/slices/transactionsSlice';
import { fetchTags } from '../store/slices/tagsSlice';
import { fetchAccounts } from '../store/slices/accountsSlice';
import { Transaction, TagMap } from '../types';
import TagSelector from './TagSelector';
import TransactionCard from './TransactionCard';
import DraggableBottomSheet from './DraggableBottomSheet';
import TransactionDetailView from './TransactionDetailView';
import SplitTransactionView from './SplitTransactionView';
import AddTransactionFlow from './AddTransactionFlow';

const getMonthYear = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
};

function Transactions() {
    const dispatch = useAppDispatch();

    const {
        transactions,
        status: transactionStatus,
        error: transactionError,
        currentPage,
        hasMore
    } = useAppSelector((state) => state.transactions);
    const { tags, status: tagsStatus, error: tagsError } = useAppSelector((state) => state.tags);
    const { accounts, status: accountsStatus, error: accountsError } = useAppSelector((state) => state.accounts);

    const isLoadingInitial = transactionStatus === 'loading' && transactions.length === 0;
    const isLoadingMore = transactionStatus === 'loadingMore';
    const overallError = transactionError || tagsError || accountsError;

    const [isTagSelectorOpen, setIsTagSelectorOpen] = useState<boolean>(false);
    const [selectedTransactionForTag, setSelectedTransactionForTag] = useState<Transaction | null>(null);
    const [isDetailViewOpen, setIsDetailViewOpen] = useState<boolean>(false);
    const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<Transaction | null>(null);
    const [isSplitViewOpen, setIsSplitViewOpen] = useState<boolean>(false);
    const [selectedTransactionForSplit, setSelectedTransactionForSplit] = useState<Transaction | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (transactionStatus === 'idle') {
            dispatch(fetchTransactions());
        }
        if (tagsStatus === 'idle') {
            dispatch(fetchTags());
        }
        if (accountsStatus === 'idle') {
            dispatch(fetchAccounts());
        }
    }, [dispatch, transactionStatus, tagsStatus, accountsStatus]);

    const tagMap = useMemo((): TagMap => {
        if (tagsStatus !== 'succeeded') return {};
        const map: TagMap = {};
        tags.forEach(tag => {
            map[tag.id] = tag;
        });
        return map;
    }, [tags, tagsStatus]);

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container && transactionStatus !== 'loadingMore' && hasMore && transactionStatus !== 'loading') {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop - clientHeight < 500) {
                dispatch(fetchTransactions({ page: currentPage + 1 }));
            }
        }
    }, [transactionStatus, hasMore, currentPage, dispatch]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => {
                container.removeEventListener('scroll', handleScroll);
            };
        }
    }, [handleScroll]);

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

        dispatch(updateTransactionTag({
            transactionId: selectedTransactionForTag.id,
            newTagId,
            originalTransaction: selectedTransactionForTag
        })).then(() => {
        }).catch((error) => {
            console.error("Failed to update tag via Redux:", error);
        });
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

    let lastRenderedMonthYear: string | null = null;

    return (
        <div className="text-foreground flex flex-col h-full bg-background">
            <div className="bg-background pt-4 border-b border-border">
                <div className="flex justify-between items-start mb-4 px-2">
                    <h1 className="text-3xl font-bold pl-2">Transactions</h1>
                    <div className="flex">
                        <button className="text-muted-foreground hover:text-foreground p-2"><FiFilter size={20} /></button>
                        <AddTransactionFlow
                            accounts={accounts}
                            tags={tags}
                            tagMap={tagMap}
                        />
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

            <div ref={scrollContainerRef} className="flex-grow overflow-y-auto thin-scrollbar px-2">
                {isLoadingInitial && <p className="text-center p-8 text-muted-foreground">Loading transactions...</p>}
                {overallError && <p className="text-center text-destructive">Error: {overallError}</p>}
                {!isLoadingInitial && !overallError && transactions.length === 0 && <p className="text-center text-muted-foreground">No transactions found.</p>}

                {transactions.length > 0 && (
                    <ul className="space-y-2 px-2">
                        {transactions.map((tx, index) => {
                            if (tx.parentId) return null;

                            const currentMonthYear = getMonthYear(tx.transactionDate);
                            const showMonthHeader = currentMonthYear !== lastRenderedMonthYear;
                            if (showMonthHeader) {
                                lastRenderedMonthYear = currentMonthYear;
                            }

                            const hasChildTransactions = tx.subTransactions != null && tx.subTransactions.length > 0;

                            return (
                                <React.Fragment key={tx.id}>
                                    {showMonthHeader && (
                                        <div className="flex justify-between items-center mb-2 px-2 pt-2">
                                            <h2 className="text-lg font-semibold text-foreground">{currentMonthYear}</h2>
                                        </div>
                                    )}
                                    <li>
                                        <div className="flex flex-col border border-border rounded-xl overflow-hidden">
                                            {hasChildTransactions && (
                                                <button className="flex justify-between items-center" onClick={() => openSplitView(tx)}>
                                                    <div className="bg-background p-3 text-xl font-medium text-secondary-foreground">
                                                        ₹{
                                                            [tx, ...(tx.subTransactions || [])].reduce((sum, t) =>
                                                                sum + (t.type === 'DEBIT' ? -t.amount : t.amount), 0
                                                            ).toLocaleString('en-IN')
                                                        }
                                                    </div>
                                                    <div className='flex flex-row items-center font-bold text-muted-foreground/50 px-3'>
                                                        <div className="bg-background text-sm font-medium text-secondary-foreground pr-2">
                                                            {tx.subTransactions?.length} split{tx.subTransactions?.length === 1 ? "" : "s"}
                                                        </div>
                                                        {">"}
                                                    </div>
                                                </button>
                                            )}
                                            <TransactionCard
                                                transaction={tx}
                                                tagMap={tagMap}
                                                onCardClick={openDetailView}
                                                onTagClick={openTagSelector}
                                                className={hasChildTransactions ? "border-t-2 border-dashed border-border" : ""}
                                            />
                                            {tx.subTransactions && tx.subTransactions.length > 0 && (
                                                <>
                                                    {tx.subTransactions.map(childTx => (
                                                        <React.Fragment key={childTx.id}>
                                                            <TransactionCard
                                                                transaction={childTx}
                                                                tagMap={tagMap}
                                                                onCardClick={openDetailView}
                                                                onTagClick={openTagSelector}
                                                                className="border-t-2 border-dashed border-border"
                                                            />
                                                        </React.Fragment>
                                                    ))}
                                                </>
                                            )}

                                        </div>
                                    </li>
                                </React.Fragment>
                            );
                        })}
                    </ul>
                )}

                <div className="h-10 flex justify-center items-center">
                    {isLoadingMore && <p className="text-sm text-muted-foreground">Loading more...</p>}
                    {!isLoadingMore && !hasMore && transactions.length > 0 && <p className="text-sm text-muted-foreground">End of transactions.</p>}
                </div>
            </div>

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
}

export default Transactions; 