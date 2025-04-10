import React from 'react';
import { FiTag, FiCreditCard } from 'react-icons/fi';
import { LuIndianRupee } from 'react-icons/lu';
import { Transaction, TagMap } from '../types';
import { formatDate } from '../utils/dateUtils';

interface TransactionCardProps {
  transaction: Transaction;
  tagMap: TagMap;
  onTagClick?: (transaction: Transaction, event: React.MouseEvent) => void;
  onCardClick?: (transaction: Transaction) => void;
}

function TransactionCard({ transaction, tagMap, onTagClick, onCardClick }: TransactionCardProps) {
  const currentTagName = transaction.tagId ? tagMap[transaction.tagId]?.name : undefined;

  return (
    <div
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      className={`bg-secondary p-3 rounded-xl shadow flex-shrink-0 w-full text-left transition-colors ${onCardClick ? 'cursor-pointer md:hover:bg-muted' : 'cursor-default'}`}
      onClick={() => onCardClick && onCardClick(transaction)}
      onKeyDown={(e) => {
        if (onCardClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onCardClick(transaction);
        }
      }}
    >
      <div className="flex justify-between items-center mb-2 pointer-events-none">
        <span className="text-muted-foreground text-base font-medium flex-grow mr-2 truncate">
          {transaction.counterParty || transaction.description}
        </span>
        <span className="text-muted-foreground text-xs flex-shrink-0">
          {formatDate(transaction.transactionDate)}
        </span>
      </div>

      <hr className="border-t border-border my-2 pointer-events-none" />

      <div className="flex justify-between items-center mt-1 pointer-events-none">
        <span className={`whitespace-nowrap flex items-center`}>
          <span className={`text-sm text-muted-foreground`}>{transaction.type === 'DEBIT' ? '-' : '+'}
            <LuIndianRupee className="inline h-4 w-4 relative -top-[1px] " />
          </span>

          <span className={`text-xl font-semibold accent-foreground`}>{transaction.amount.toLocaleString('en-IN')}</span>
        </span>
        <div className="flex items-center space-x-2 whitespace-nowrap overflow-hidden text-ellipsis pointer-events-auto">
          <button
            onClick={(e) => onTagClick && onTagClick(transaction, e)}
            disabled={!onTagClick}
            className={`text-sm text-secondary-foreground px-2 py-1.5 rounded-lg flex items-center space-x-1 bg-input 
                      ${onTagClick ? 'cursor-pointer hover:bg-border transition-colors' : 'cursor-default'}`}
          >
            {currentTagName ? (
              <>
                <span>{currentTagName}</span>
              </>
            ) : (
              <FiTag className="text-muted-foreground" />
            )}
          </button>
          {transaction.account && (
            <span className="text-primary flex items-center pointer-events-none" title={`Account ID: ${transaction.account.id}`}>
              <FiCreditCard size={24} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionCard; 