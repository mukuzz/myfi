import React, { useEffect, useMemo } from 'react';
import Card from './Card';
import { Transaction, Tag } from '../types';
import { FiMoreHorizontal } from 'react-icons/fi';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchCurrentMonthTransactions } from '../store/slices/transactionsSlice';
import { fetchTags } from '../store/slices/tagsSlice';

interface TagSpending {
    name: string;
    amount: number;
}

const SpendingSummary: React.FC = () => {
    const dispatch = useAppDispatch();

    const { 
        currentMonthTransactions,
        currentMonthStatus: transactionsStatus,
        currentMonthError: transactionsError 
    } = useAppSelector((state) => state.transactions);
    const {
        tags,
        status: tagsStatus,
        error: tagsError
    } = useAppSelector((state) => state.tags);

    const isLoading = transactionsStatus === 'loading' || tagsStatus === 'loading';
    const error = transactionsError || tagsError;

    useEffect(() => {
        if (transactionsStatus === 'idle') {
            dispatch(fetchCurrentMonthTransactions());
        }
        if (tagsStatus === 'idle') {
            dispatch(fetchTags());
        }
    }, [dispatch, transactionsStatus, tagsStatus]);

    const formatCurrency = (amount: number): string => {
        const formatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        });
        const formatted = formatter.format(Math.abs(amount)).replace(/^₹\s/, '₹');
        return `${formatted}`;
    };

    const spendingByTag = useMemo((): TagSpending[] => {
        if (transactionsStatus !== 'succeeded' || tagsStatus !== 'succeeded') {
            return [];
        }

        const tagMap = new Map<number, string>();
        const tagParentMap = new Map<number, number | null>();
        const childTagMap = new Map<number | null, number[]>();

        tags.forEach((tag: Tag) => {
            if (tag.id !== undefined) {
                 tagMap.set(tag.id, tag.name);
                 const parentId = tag.parentTagId ?? null;
                 tagParentMap.set(tag.id, parentId);
                 if (!childTagMap.has(parentId)) {
                     childTagMap.set(parentId, []);
                 }
                 childTagMap.get(parentId)?.push(tag.id);
            }
        });
        tagMap.set(0, "Untagged");
        tagParentMap.set(0, null);

        const initialSpendingMap = new Map<number, number>();
        tagMap.forEach((_, tagId) => {
            initialSpendingMap.set(tagId, 0);
        });

        currentMonthTransactions.forEach((tx: Transaction) => {
            if (tx.type === 'DEBIT' && !tx.excludeFromAccounting) {
                const tagId = tx.tagId ?? 0;
                const currentAmount = initialSpendingMap.get(tagId) || 0;
                if (initialSpendingMap.has(tagId)) {
                    initialSpendingMap.set(tagId, currentAmount + tx.amount);
                }
            }
        });

        const memo = new Map<number, number>();
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

        const aggregatedSpending: TagSpending[] = [];
        tagMap.forEach((name, tagId) => {
            const parentId = tagParentMap.get(tagId);
            if (parentId === null || tagId === 0) {
                 const totalAmount = calculateTotalSpending(tagId);
                 if (totalAmount > 0) {
                    aggregatedSpending.push({ name, amount: totalAmount });
                 }
            }
        });

        aggregatedSpending.sort((a, b) => b.amount - a.amount);

        return aggregatedSpending;

    }, [currentMonthTransactions, tags, transactionsStatus, tagsStatus]);

    const currentDate = new Date();
    const monthYear = `${currentDate.toLocaleString('default', { month: 'long' }).toUpperCase()} ${currentDate.getFullYear()}`;

    const totalSpending = useMemo(() => {
        return spendingByTag.reduce((sum, item) => sum + item.amount, 0);
    }, [spendingByTag]);

    return (
        <Card className="flex flex-col">
            <header className="pl-4 pr-2 border-b border-border flex items-center justify-between flex-shrink-0">
                <h1 className="text-xs font-bold">Spending Summary</h1>
                <button className="text-muted-foreground p-2">
                    <FiMoreHorizontal size={20} />
                </button>
            </header>

            <div className="p-4 space-y-4 flex-grow overflow-y-auto bg-secondary">
                <div className="text-xs font-semibold text-muted-foreground">
                    {monthYear}
                </div>

                <div className="space-y-3">
                     {isLoading && <p className="text-muted-foreground text-center">Loading...</p>}
                     {error && <p className="text-destructive text-center">Error: {error}</p>}
                     {!isLoading && !error && spendingByTag.length === 0 && (
                        <p className="text-muted-foreground text-center">No spending data for this period.</p>
                     )}
                     {!isLoading && !error && spendingByTag.map((item, index) => {
                        const barWidthPercentage = totalSpending > 0 ? (item.amount / totalSpending) * 100 : 0;
                        return (
                            <div key={index} className="flex justify-between items-center space-x-2">
                                <div className="relative flex-1 min-w-0">
                                    <div 
                                        className="absolute inset-y-0 left-0 bg-muted rounded-lg" 
                                        style={{ width: `${barWidthPercentage}%`, zIndex: 1 }} 
                                        aria-hidden="true"
                                    ></div>
                                    <span 
                                        className="relative font-medium text-card-foreground block truncate px-2 py-1"
                                        style={{ zIndex: 2 }}
                                    >
                                        {item.name}
                                    </span>
                                </div>
                                <span className="font-medium text-card-foreground whitespace-nowrap">
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