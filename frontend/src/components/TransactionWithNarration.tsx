import React from 'react';
import { Transaction, TagMap } from '../types';
import TransactionCard from './TransactionCard';

interface TransactionWithNarrationProps {
  transaction: Transaction;
  tagMap: TagMap;
  onTagClick?: (transaction: Transaction, event: React.MouseEvent) => void;
}

const TransactionWithNarration: React.FC<TransactionWithNarrationProps> = ({ transaction, tagMap, onTagClick }) => {
  return (
    <div className="rounded-xl shadow overflow-hidden bg-muted p-1 mb-4 flex-shrink-0">
      <TransactionCard transaction={transaction} tagMap={tagMap} onTagClick={onTagClick} />
      {transaction.description && (
        <div className="bg-muted p-2 mt-1">
          <div className="flex justify-between items-start">
            <p className="text-xs text-muted-foreground mr-2">
              <span className="font-medium text-secondary-foreground">Narration:</span> {transaction.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionWithNarration; 