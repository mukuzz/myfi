import React, { useState, useEffect, useRef } from 'react';
import { FiFilter, FiSearch } from 'react-icons/fi';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchTags, selectTagMap } from '../store/slices/tagsSlice';
import { fetchAccounts } from '../store/slices/accountsSlice';
import { fetchTransactions } from '../store/slices/transactionsSlice';
import AddTransactionFlow from './AddTransactionFlow';
import TransactionList from './TransactionList';
import { useIsMobile } from '../hooks/useIsMobile';

function Transactions() {
  const dispatch = useAppDispatch();

  const { tags, status: tagsStatus, error: tagsError } = useAppSelector((state) => state.tags);
  const { accounts, status: accountsStatus, error: accountsError } = useAppSelector((state) => state.accounts);
  const tagMap = useAppSelector(selectTagMap);
  const {
    transactions,
    status: transactionStatus,
    error: transactionError
  } = useAppSelector((state) => state.transactions);

  const isLoadingInitial = transactionStatus === 'loading' && transactions.length === 0;
  const isLoadingMore = transactionStatus === 'loadingMore';
  const overallError = tagsError || accountsError || transactionError;

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);
  const [parentWidth, setParentWidth] = useState<number | null>(null);
  const isMobile = useIsMobile();
  useEffect(() => {
    if (tagsStatus === 'idle') {
      dispatch(fetchTags());
    }
    if (accountsStatus === 'idle') {
      dispatch(fetchAccounts());
    }
    if (transactionStatus === 'idle') {
      dispatch(fetchTransactions({ page: 0 }));
    }
  }, [dispatch, tagsStatus, accountsStatus, transactionStatus]);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  useEffect(() => {
    const parentElement = parentRef.current;
    if (!parentElement) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === parentElement && entry.target instanceof HTMLElement) {
          setParentWidth(entry.target.offsetWidth);
        }
      }
    });

    resizeObserver.observe(parentElement);

    setParentWidth(parentElement.offsetWidth);

    return () => {
      resizeObserver.unobserve(parentElement);
    };
  }, []);

  return (
    <div ref={parentRef} className="text-foreground flex flex-col h-full bg-background relative">
      <div
        ref={headerRef}
        className={`${isMobile ? 'fixed' : 'absolute'} top-0 bg-background pt-4 border-b border-border z-10`}
        style={{ width: parentWidth ? `${parentWidth}px` : '100%' }}
      >
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
            placeholder={`Search transactions...`}
            className="w-full bg-input border border-input rounded-lg pl-8 pr-4 py-1 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary"
          />
        </div>
      </div>

      {isLoadingInitial && <p className="text-center p-8 text-muted-foreground">Loading transactions...</p>}
      {overallError && <p className="text-center text-destructive">Error: {overallError}</p>}
      {!isLoadingInitial && !overallError && transactions.length === 0 && transactionStatus === 'succeeded' && (
        <p className="text-center p-8 text-muted-foreground">No transactions found.</p>
      )}

      {overallError && <p className="text-center text-destructive p-4">Error loading data: {overallError}</p>}

      <TransactionList
        headerHeight={headerHeight}
        transactions={transactions}
      />

    </div>
  );
}

export default Transactions; 