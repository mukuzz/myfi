import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchTags, selectTagMap } from '../store/slices/tagsSlice';
import { fetchAccounts } from '../store/slices/accountsSlice';
import { fetchTransactions } from '../store/slices/transactionsSlice';
import AddTransactionFlow from '../components/AddTransactionFlow';
import TransactionList from '../components/TransactionList';
import TransactionRowSkeleton from '../components/skeletons/TransactionRowSkeleton';

function TransactionsScreen() {
  const dispatch = useAppDispatch();

  const { tags, status: tagsStatus, error: tagsError } = useAppSelector((state) => state.tags);
  const { accounts, status: accountsStatus, error: accountsError } = useAppSelector((state) => state.accounts);
  const tagMap = useAppSelector(selectTagMap);
  const {
    transactions,
    status: transactionStatus,
    error: transactionError,
    hasMore
  } = useAppSelector((state) => state.transactions);

  const [currentPage, setCurrentPage] = useState(0);
  const isLoadingInitial = transactionStatus === 'loading' && transactions.length === 0;
  const isLoadingMore = transactionStatus === 'loadingMore';
  const overallError = tagsError || accountsError || transactionError;
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tagsStatus === 'idle') {
      dispatch(fetchTags());
    }
    if (accountsStatus === 'idle') {
      dispatch(fetchAccounts());
    }
    if (transactionStatus === 'idle' || transactionStatus === 'succeeded') {
      dispatch(fetchTransactions({ page: 0 }));
      setCurrentPage(0);
    }
  }, [dispatch, tagsStatus, accountsStatus, transactionStatus, transactions.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasMore && transactionStatus !== 'loadingMore' && transactionStatus !== 'failed') {
          const nextPage = currentPage + 1;
          dispatch(fetchTransactions({ page: nextPage }));
          setCurrentPage(nextPage);
        }
      },
      { threshold: 1.0, rootMargin: '0px 0px 600px 0px' } // Trigger when the element is fully visible
    );

    const currentObserverRef = observerRef.current;
    if (currentObserverRef) {
      observer.observe(currentObserverRef);
    }

    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef);
      }
    };
  }, [dispatch, hasMore, currentPage, transactionStatus]);

  return (
    <div className="text-foreground flex flex-col justify-stretch h-full bg-background relative overflow-y-auto enable-scroll">
      <div
        className={`flex-shrink-0 pt-4`}
      >
        <div className="flex justify-between items-center pl-2 pr-3">
          <h1 className="text-3xl font-bold pl-2">Transactions</h1>
          <div className="flex">
            {/* <button className="text-muted-foreground hover:text-foreground p-2"><FiFilter size={20} /></button> */}
            <AddTransactionFlow
              accounts={accounts}
              tags={tags}
              tagMap={tagMap}
            />
          </div>
        </div>
      </div>

      <div className='flex-grow h-full pb-2'>
        {isLoadingInitial && (
          <div className="overflow-y-auto p-4 space-y-2">
            <TransactionRowSkeleton />
            <TransactionRowSkeleton />
            <TransactionRowSkeleton />
            <TransactionRowSkeleton />
            <TransactionRowSkeleton />
            <TransactionRowSkeleton />
            <TransactionRowSkeleton />
          </div>
        )}

        {!isLoadingInitial && !overallError && transactions.length === 0 && transactionStatus === 'succeeded' && (
          <div className="p-8 text-center text-muted-foreground">
            No transactions found.
          </div>
        )}  
        <TransactionList
          transactions={transactions}
        />

        <div ref={observerRef} className="flex justify-center items-center h-12">
          {isLoadingMore && (
            <p className="text-center text-muted-foreground">Loading more transactions...</p>
          )}
          {!hasMore && !isLoadingMore && (
            <p className="text-center text-muted-foreground">No more transactions.</p>
          )}
        </div>

      </div>

    </div>
  );
}

export default TransactionsScreen; 