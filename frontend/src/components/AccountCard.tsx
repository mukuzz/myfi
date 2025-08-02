import React from 'react';
import { Account } from '../types';
import { FiCopy, FiEdit2 } from 'react-icons/fi';
import CurrencyDisplay from './AmountDisplay';
import AccountIcon from './AccountIcon';

interface AccountCardProps {
  account: Account;
  handleCopyAccountNumber: (accountNumber: string) => Promise<void>;
  showBalance?: boolean;
  onEditBalance?: () => void;
  showEditBalance?: boolean;
}

const getAccountTypeLabel = (type: Account['type']) => {
  return type.split('_').map(word =>
    word.charAt(0) + word.slice(1).toLowerCase()
  ).join(' ');
};

const AccountCard: React.FC<AccountCardProps> = ({ 
  account,  
  handleCopyAccountNumber,
  showBalance = true,
  onEditBalance,
  showEditBalance = false
}) => {
  return (
    <div 
      className="p-4 bg-secondary h-full hover:bg-secondary/90 transition-colors"
    > 
      {/* Top row: Logo/Balance */}
      <div className="flex justify-between items-center">
        <AccountIcon account={account} className="w-6 h-6" />
        {showBalance && (
          <div className="flex items-center space-x-1">
            <CurrencyDisplay 
              amount={account.balance} 
              className="font-semibold text-right text-lg" 
              showOnlyNegative={true}
            />
            {showEditBalance && onEditBalance && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditBalance();
                }}
                className="p-1 text-muted-foreground hover:text-primary transition-colors"
                title="Edit balance"
              >
                <FiEdit2 className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
      {/* Middle row: Name/Type */}
      <div className="flex justify-between items-center mt-3"> 
         <h2 className="font-bold text-foreground text-xl"> 
            {account.name}
         </h2>
         <p className="text-foreground text-xs bg-muted px-2 py-1 rounded-full">
            {getAccountTypeLabel(account.type)}
         </p>
      </div>
       {/* Bottom row: Number/Copy */}
      <div className="flex flex-col items-start mt-2"> 
        <p className="text-muted-foreground text-xs uppercase truncate"> 
          Account Number
        </p>
        <div className="flex items-center space-x-2">
          <p className="text-foreground text-sm">
            {account.accountNumber.replace(/(\d{4})(?=\d)/g, '$1 ')}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyAccountNumber(account.accountNumber);
            }}
            className="text-muted-foreground hover:text-primary focus:outline-none"
            title="Copy account number"
          >
            <FiCopy className="h-4 w-4" /> 
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountCard; 