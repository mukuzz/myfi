import React from 'react';
import { FiTag, FiCreditCard } from 'react-icons/fi';
import { LuIndianRupee } from 'react-icons/lu';
import { Transaction } from '../types';
import { formatDate } from '../utils/dateUtils';
import { getTagIcon } from '../utils/transactionUtils';

interface TransactionDetailsCardProps {
  transaction: Transaction;
  tagMap: Map<number, string>;
  onTagClick?: (transaction: Transaction) => void;
}

function TransactionDetailsCard({ transaction, tagMap, onTagClick }: TransactionDetailsCardProps) {
  const currentTagName = transaction.tagId ? tagMap.get(transaction.tagId) : undefined;
  const currentTagIcon = currentTagName ? getTagIcon(currentTagName) : <FiTag className="text-muted-foreground"/>;

  return (
    <div className="bg-secondary p-3 rounded-xl shadow flex-shrink-0">
      <div className="flex justify-between items-center mb-2">
        <span className="text-foreground text-base font-medium flex-grow mr-2 truncate">
          {transaction.counterParty || transaction.description}
        </span>
        <span className="text-muted-foreground text-xs flex-shrink-0">
          {formatDate(transaction.transactionDate)}
        </span>
      </div>

      <hr className="border-t border-border my-2" />

      <div className="flex justify-between items-center mt-1">
        <span className={`text-xl font-semibold ${transaction.type === 'DEBIT' ? 'text-error' : 'text-success'}`}>
          {transaction.type === 'DEBIT' ? '-' : '+'}
          <LuIndianRupee className="inline h-4 w-4 relative -top-[1px]" />
          {transaction.amount.toLocaleString('en-IN')}
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onTagClick && onTagClick(transaction)}
            disabled={!onTagClick}
            className={`text-sm text-secondary-foreground px-2 py-1.5 rounded-lg flex items-center space-x-1 bg-input 
                      ${onTagClick ? 'cursor-pointer hover:bg-border transition-colors' : 'cursor-default'}`}
          >
            {currentTagName ? (
              <>
                {currentTagIcon}
                <span>{currentTagName}</span>
              </>
            ) : (
              <FiTag className="text-muted-foreground"/>
            )}
          </button>
          {transaction.accountId && (
            <span className="text-primary flex items-center" title={`Account ID: ${transaction.accountId}`}>
              <FiCreditCard size={24}/>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionDetailsCard; 