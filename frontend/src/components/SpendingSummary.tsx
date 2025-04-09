import React, { useState, useEffect, useMemo } from 'react';
import Card from './Card';
import { fetchTransactionsAndTags } from '../services/apiService';
import { Transaction } from '../types';
import { FiMoreHorizontal } from 'react-icons/fi';

interface TagSpending {
    name: string;
    amount: number;
}

const SpendingSummary: React.FC = () => {
    const [spendingByTag, setSpendingByTag] = useState<TagSpending[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Simple INR formatter
    const formatCurrency = (amount: number): string => {
        // Use 'en-IN' but customize to remove space after currency symbol if needed
        // and ensure no trailing decimals for whole numbers.
        const formatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
        // Format, then manually replace '₹ ' with '₹' if present at the start
        const formatted = formatter.format(Math.abs(amount)).replace(/^₹\s/, '₹');
        return `${formatted}`; // Prepend with '-'
    };


    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { transactions, tags } = await fetchTransactionsAndTags();

                // --- Data Structures for Tag Hierarchy and Spending ---

                // 1. Map tag ID to tag name
                const tagMap = new Map<number, string>();
                // 2. Map tag ID to its parent ID (null for top-level)
                const tagParentMap = new Map<number, number | null>();
                // 3. Map parent tag ID to list of its direct children IDs
                const childTagMap = new Map<number | null, number[]>();

                tags.forEach(tag => {
                    if (tag.id !== undefined) { // Ensure tag.id is defined
                         tagMap.set(tag.id, tag.name);
                         const parentId = tag.parentTagId ?? null;
                         tagParentMap.set(tag.id, parentId);

                         // Populate childTagMap
                         if (!childTagMap.has(parentId)) {
                             childTagMap.set(parentId, []);
                         }
                         childTagMap.get(parentId)?.push(tag.id);
                    }
                });
                // Add an entry for untagged transactions if needed
                tagMap.set(0, "Untagged"); // Assuming 0 or null represents untagged
                tagParentMap.set(0, null); // Untagged has no parent

                // --- Initial Spending Calculation (Direct Spending per Tag) ---

                const initialSpendingMap = new Map<number, number>();
                // Initialize spending for all known tags + untagged (0) to 0
                tagMap.forEach((_, tagId) => {
                    initialSpendingMap.set(tagId, 0);
                });

                transactions.forEach((tx: Transaction) => {
                    // Consider only DEBIT transactions as spending and not excluded
                    if (tx.type === 'DEBIT' && !tx.excludeFromAccounting) {
                        const tagId = tx.tagId ?? 0; // Use 0 for null/undefined tagId
                        const currentAmount = initialSpendingMap.get(tagId) || 0;
                        // Ensure the tag exists in the map before adding amount
                        if (initialSpendingMap.has(tagId)) {
                            initialSpendingMap.set(tagId, currentAmount + tx.amount);
                        }
                    }
                });

                // --- Recursive Function for Aggregated Spending ---
                const memo = new Map<number, number>(); // Memoization for performance

                const calculateTotalSpending = (tagId: number): number => {
                    if (memo.has(tagId)) {
                        return memo.get(tagId)!;
                    }

                    let total = initialSpendingMap.get(tagId) || 0;
                    const children = childTagMap.get(tagId) || [];

                    for (const childId of children) {
                        total += calculateTotalSpending(childId);
                    }

                    memo.set(tagId, total);
                    return total;
                };

                // --- Calculate Aggregated Spending for Top-Level Tags ---
                const aggregatedSpending: TagSpending[] = [];
                tagMap.forEach((name, tagId) => {
                    const parentId = tagParentMap.get(tagId);
                    // Include if it's a top-level tag (parent is null) or the special "Untagged" (ID 0)
                    if (parentId === null || tagId === 0) {
                         const totalAmount = calculateTotalSpending(tagId);
                         // Only add if there's actual spending associated with it or its children
                         if (totalAmount > 0) {
                            aggregatedSpending.push({ name, amount: totalAmount });
                         }
                    }
                });

                // Sort descending by aggregated amount
                aggregatedSpending.sort((a, b) => b.amount - a.amount);

                setSpendingByTag(aggregatedSpending);

            } catch (err) {
                console.error("Failed to load spending summary:", err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // --- Get Current Month and Year ---
    // Note: This uses the current date, not derived from transactions yet.
    // For transaction-based date, you'd need to parse transaction dates.
    const currentDate = new Date();
    const monthYear = `${currentDate.toLocaleString('default', { month: 'long' }).toUpperCase()} ${currentDate.getFullYear()}`;

    // Calculate total spending for bar width percentage calculation
    const totalSpending = useMemo(() => {
        return spendingByTag.reduce((sum, item) => sum + item.amount, 0);
    }, [spendingByTag]);

    return (
        <Card className="flex flex-col">
            {/* Header - Styled like AccountsCard */}
            <header className="pl-4 pr-2 border-b border-border flex items-center justify-between flex-shrink-0">
                <h1 className="text-xs font-bold">Spending Summary</h1>
                <button className="text-muted-foreground p-2">
                    <FiMoreHorizontal size={20} />
                </button>
            </header>

            {/* Content Area with Padding */}
            <div className="p-4 space-y-4 flex-grow overflow-y-auto bg-secondary">
                {/* Date */}
                <div className="text-sm font-semibold text-muted-foreground">
                    {monthYear}
                </div>

                {/* Account Icons Placeholder - Omitted */}

                {/* Spending List - No change to list itself, just its container */}
                <div className="space-y-3">
                     {isLoading && <p className="text-muted-foreground text-center">Loading...</p>}
                     {error && <p className="text-destructive text-center">Error: {error}</p>}
                     {!isLoading && !error && spendingByTag.length === 0 && (
                        <p className="text-muted-foreground text-center">No spending data for this period.</p>
                     )}
                     {!isLoading && !error && spendingByTag.map((item, index) => {
                        // Calculate bar width percentage using total spending
                        const barWidthPercentage = totalSpending > 0 ? (item.amount / totalSpending) * 100 : 0;
                        return (
                            <div key={index} className="flex justify-between items-center space-x-2">
                                {/* Category Name with Bar Background */}
                                <div className="relative flex-1 min-w-0">
                                    {/* Bar element */}
                                    <div 
                                        className="absolute inset-y-0 left-0 bg-muted rounded-lg" 
                                        style={{ width: `${barWidthPercentage}%`, zIndex: 1 }} 
                                        aria-hidden="true" // Hide from screen readers
                                    ></div>
                                    {/* Category Name Text (on top) */}
                                    <span 
                                        className="relative text-sm font-medium text-card-foreground block truncate px-2 py-1" // Added relative, z-index, padding, block, truncate
                                        style={{ zIndex: 2 }}
                                    >
                                        {item.name}
                                    </span>
                                </div>
                                {/* Amount Text */}
                                <span className="text-sm font-semibold text-card-foreground whitespace-nowrap"> {/* Added whitespace-nowrap */}
                                    {formatCurrency(item.amount)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
};

export default SpendingSummary; 