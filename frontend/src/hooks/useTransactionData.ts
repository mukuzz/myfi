import { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Tag, TagMap } from '../types';
import { fetchTransactions, fetchTags, updateTransactionTagApi } from '../services/apiService';

// Define Page interface based on Spring Data Page object
interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number; // Current page number (0-indexed)
  numberOfElements: number; // Number of elements in the current page
  first: boolean;
  last: boolean;
  empty: boolean;
}

const DEFAULT_PAGE_SIZE = 20;

export function useTransactionData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0); // 0-indexed
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const tagMap: TagMap = useMemo(() => {
    const map: TagMap = {};
    tags.forEach(tag => {
      map[tag.id] = tag;
    });
    return map;
  }, [tags]);

  // Function to fetch transactions for a specific page
  const fetchTransactionPage = useCallback(async (page: number, pageSize: number) => {
    if (page === 0) {
      setLoading(true); // Full loading for the first page
    } else {
      setLoadingMore(true); // Indicate loading more for subsequent pages
    }
    setError(null);
    try {
      // Fetch transactions with pagination parameters
      const pageData = await fetchTransactions(page, pageSize);

      setTransactions(prev => page === 0 ? pageData.content : [...prev, ...pageData.content]);
      setTotalPages(pageData.totalPages);
      setCurrentPage(pageData.number);
      setHasMore(!pageData.last);

      // Fetch tags only once, typically on the initial load
      if (page === 0) {
        const fetchedTags = await fetchTags();
        setTags(fetchedTags);
      }

    } catch (e: any) {
      setError(e.message);
      // Optionally reset state or handle error more gracefully
      if (page === 0) setTransactions([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchTransactionPage(0, DEFAULT_PAGE_SIZE);
  }, [fetchTransactionPage]);

  // Function to load the next page
  const loadMoreTransactions = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchTransactionPage(currentPage + 1, DEFAULT_PAGE_SIZE);
    }
  }, [loadingMore, hasMore, currentPage, fetchTransactionPage]);

  // Function to refetch the first page (e.g., after an update)
  const refetchData = useCallback(() => {
    setTransactions([]); // Clear existing transactions before refetching
    setCurrentPage(0);
    setHasMore(true);
    fetchTransactionPage(0, DEFAULT_PAGE_SIZE);
  }, [fetchTransactionPage]);

  const updateTransactionTag = useCallback(async (transactionToUpdate: Transaction, newTagId: number | null) => {
    if (!transactionToUpdate) return;

    const originalTagId = transactionToUpdate.tagId;
    const transactionId = transactionToUpdate.id;
    const { id, tagId, ...otherTransactionData } = transactionToUpdate;

    setTransactions(prev =>
      prev.map(tx =>
        tx.id === transactionId ? { ...tx, tagId: newTagId ?? undefined } : tx
      )
    );

    try {
      await updateTransactionTagApi(transactionId, otherTransactionData, newTagId);
      // Maybe refetch specific page or just rely on current data for simplicity
    } catch (e: any) {
      console.error("Failed to update transaction tag:", e);
      setError(`Failed to update tag: ${e.message}`);
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === transactionId ? { ...tx, tagId: originalTagId } : tx
        )
      );
    }
  }, [setTransactions]); // Removed fetchData dependency, rely on refetchData

  return {
    transactions,
    tags,
    tagMap,
    loading,
    error,
    updateTransactionTag,
    refetchData, // Use the new refetchData
    loadMoreTransactions, // Expose function to load more
    hasMore, // Indicate if more data is available
    loadingMore // Indicate if loading more is in progress
  };
} 