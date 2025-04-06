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
  const currentTagIcon = currentTagName ? getTagIcon(currentTagName) : <FiTag />;

  return (
    <div className="bg-gray-800 p-3 rounded-xl shadow flex-shrink-0">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-300 text-sm font-medium flex-grow mr-2 truncate">
          {transaction.counterParty || transaction.description}
        </span>
        <span className="text-gray-400 text-xs flex-shrink-0">
          {formatDate(transaction.transactionDate)}
        </span>
      </div>

      <hr className="border-t border-gray-700 my-2" />

      <div className="flex justify-between items-center mt-1">
        <span className={`text-lg font-semibold ${transaction.type === 'DEBIT' ? 'text-red-400' : 'text-green-400'}`}>
          {transaction.type === 'DEBIT' ? '-' : '+'}
          <LuIndianRupee className="inline h-4 w-4 relative -top-[1px]" />
          {transaction.amount.toLocaleString('en-IN')}
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onTagClick && onTagClick(transaction)}
            disabled={!onTagClick}
            className={`text-xs ${currentTagName ? 'bg-gray-700' : 'border border-dashed border-gray-600'} text-gray-300 px-2 py-1 rounded-full flex items-center space-x-1 ${onTagClick ? 'cursor-pointer hover:bg-gray-600 transition-colors' : 'cursor-default'}`}
          >
            {currentTagName ? (
              <>
                {currentTagIcon}
                <span>{currentTagName}</span>
              </>
            ) : (
              <FiTag className="text-gray-500"/>
            )}
          </button>
          {transaction.accountId && (
            <span className="text-blue-400 flex items-center" title={`Account ID: ${transaction.accountId}`}>
              <FiCreditCard size={14}/>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionDetailsCard; 