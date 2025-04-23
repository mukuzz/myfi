import React from 'react';
import { Account } from '../types';
import { FiCopy } from 'react-icons/fi';
import CurrencyDisplay from './CurrencyDisplay';

interface AccountCardProps {
  account: Account;
  getBankLogo: (bankName: string) => React.ReactNode;
  getAccountTypeLabel: (type: Account['type']) => string;
  handleCopyAccountNumber: (accountNumber: string) => Promise<void>;
  onCardClick: (account: Account) => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ 
  account, 
  getBankLogo,
  getAccountTypeLabel,
  handleCopyAccountNumber,
  onCardClick
}) => {
  return (
    <div 
      className="p-4 bg-secondary cursor-pointer hover:bg-secondary/90 transition-colors" 
      onClick={() => onCardClick(account)}
    > 
      {/* Top row: Logo/Balance */}
      <div className="flex justify-between items-center">
        {getBankLogo(account.name)}
        <CurrencyDisplay 
          amount={account.balance} 
          
          className="font-semibold text-right text-lg" 
          showOnlyNegative={true}
        />
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