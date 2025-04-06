import { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Tag } from '../types';

const API_BASE_URL = process.env.API_BASE_URL || 'http://192.168.1.5:8080'; // Default for safety

export function useTransactionData() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const tagMap = useMemo(() => {
    const map = new Map<number, string>();
    tags.forEach(tag => {
      map.set(tag.id, tag.name);
    });
    return map;
  }, [tags]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [transactionsResponse, tagsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/transactions`),
        fetch(`${API_BASE_URL}/api/v1/tags`)
      ]);

      if (!transactionsResponse.ok) {
        throw new Error(`HTTP error fetching transactions! status: ${transactionsResponse.status}`);
      }
      if (!tagsResponse.ok) {
        throw new Error(`HTTP error fetching tags! status: ${tagsResponse.status}`);
      }

      const transactionsData = await transactionsResponse.json();
      const tagsData = await tagsResponse.json();

      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      setTags(Array.isArray(tagsData) ? tagsData : []);

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

    // Optimistic update
    setTransactions(prev =>
      prev.map(tx =>
        tx.id === transactionId ? { ...tx, tagId: newTagId ?? undefined } : tx
      )
    );

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...transactionToUpdate, // Send the original transaction data
            tagId: newTagId // Only update the tagId field
        }),
      });

      if (!response.ok) {
         const errorBody = await response.text();
         console.error("Server error response:", errorBody);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log("Transaction tag updated successfully via API");
      // No need to set state again, optimistic update handled it.
      // Optionally: refetch data to ensure consistency if needed, but optimistic is usually enough.
      // fetchData(); 

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
  }, []); // Dependency array is empty as it uses state setters and constants defined outside

  return { transactions, tags, tagMap, loading, error, updateTransactionTag, refetchData: fetchData };
} 