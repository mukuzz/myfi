import { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Tag, TagMap } from '../types';
import { fetchTransactionsAndTags, updateTransactionTagApi } from '../services/apiService';

export function useTransactionData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const tagMap: TagMap = useMemo(() => {
    const map: TagMap = {}; // Use plain object for the desired type
    tags.forEach(tag => {
      map[tag.id] = tag; // Store the full tag object
    });
    return map;
  }, [tags]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { transactions: fetchedTransactions, tags: fetchedTags } = await fetchTransactionsAndTags();
      setTransactions(fetchedTransactions);
      setTags(fetchedTags);

    } catch (e: any) {
      setError(e.message);
      setTransactions([]);
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateTransactionTag = useCallback(async (transactionToUpdate: Transaction, newTagId: number | null) => {
    if (!transactionToUpdate) return;

    const originalTagId = transactionToUpdate.tagId;
    const transactionId = transactionToUpdate.id;
    // Exclude id and tagId from the data sent to the API
    const { id, tagId, ...otherTransactionData } = transactionToUpdate;

    // Optimistic update
    setTransactions(prev =>
      prev.map(tx =>
        tx.id === transactionId ? { ...tx, tagId: newTagId ?? undefined } : tx
      )
    );

    try {
      await updateTransactionTagApi(transactionId, otherTransactionData, newTagId);
    } catch (e: any) {
      console.error("Failed to update transaction tag:", e);
      setError(`Failed to update tag: ${e.message}`);
      // Rollback optimistic update on error
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === transactionId ? { ...tx, tagId: originalTagId } : tx
        )
      );
    }
  }, [setTransactions]);

  return { transactions, tags, tagMap, loading, error, updateTransactionTag, refetchData: fetchData };
} 