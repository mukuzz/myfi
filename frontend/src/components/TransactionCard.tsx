import React from 'react';
import { FiTag, FiCreditCard } from 'react-icons/fi';
import { Transaction, TagMap } from '../types';
import { formatDate } from '../utils/dateUtils';
import { ReactComponent as ExcludedIcon } from '../assets/icons/ExcludedFromAccountingIcon.svg';
import CurrencyDisplay from './AmountDisplay';
import AccountIcon from './AccountIcon';

interface TransactionCardProps {
  transaction: Transaction;
  tagMap: TagMap;
  onTagClick?: (transaction: Transaction, event: React.MouseEvent) => void;
  onCardClick?: (transaction: Transaction) => void;
  className?: string;
}

function TransactionCard({ transaction, tagMap, onTagClick, onCardClick, className }: TransactionCardProps) {
  const currentTagName = transaction.tagId ? tagMap[transaction.tagId]?.name : undefined;

  return (
    <div
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      className={`bg-secondary p-3 flex-shrink-0 w-full text-left transition-colors ${onCardClick ? 'cursor-pointer' : 'cursor-default'} ${className}`}
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
        <CurrencyDisplay 
          amount={transaction.amount}
          className='text-xl font-bold text-foreground'
          smallRupeeSymbol={true}
          type={transaction.type}
        />
        <div className="flex items-center space-x-2 whitespace-nowrap overflow-hidden text-ellipsis pointer-events-auto">
          <button
            onClick={(e) => onTagClick && onTagClick(transaction, e)}
            disabled={!onTagClick}
            className={`text-sm text-secondary-foreground px-2 py-1.5 rounded-lg flex items-center space-x-1 bg-input 
                      ${onTagClick ? 'cursor-pointer transition-colors' : 'cursor-default'}`}
          >
            {currentTagName ? (
              <>
                <FiTag size={14} className="text-muted-foreground" />
                <span>{currentTagName}</span>
              </>
            ) : (
              <FiTag className="text-muted-foreground" />
            )}
          </button>
          {transaction.excludeFromAccounting && (
            <span className="text-muted-foreground flex items-center pointer-events-none" title="Excluded from accounting">
              <ExcludedIcon className="h-6 w-6" />
            </span>
          )}
          {transaction.account && (
            <div className="flex items-center pointer-events-none" title={`Account ID: ${transaction.account.id}`}>
              <AccountIcon account={transaction.account} className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionCard; 