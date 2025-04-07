import React from 'react';
import { Account } from '../types';
import { FiCopy } from 'react-icons/fi';

interface AccountCardProps {
  account: Account;
  getBankLogo: (bankName: string) => React.ReactNode;
  formatCurrency: (amount: number, currency: string) => string;
  getAccountTypeLabel: (type: Account['type']) => string;
  handleCopyAccountNumber: (accountNumber: string) => Promise<void>;
}

const AccountCard: React.FC<AccountCardProps> = ({ 
  account, 
  getBankLogo,
  formatCurrency,
  getAccountTypeLabel,
  handleCopyAccountNumber
}) => {
  return (
    <div className="p-4"> 
      {/* Top row: Logo/Balance */}
      <div className="flex justify-between items-center">
        {getBankLogo(account.name)}
        <p className="font-semibold text-right text-lg"> 
           {formatCurrency(account.balance, account.currency)}
        </p>
      </div>
      {/* Middle row: Name/Type */}
      <div className="flex justify-between items-center mt-6"> 
         <h2 className="font-bold text-foreground text-xl"> 
            {account.name}
         </h2>
         <p className="text-foreground text-xs bg-secondary px-2 py-1 rounded-full">
            {getAccountTypeLabel(account.type)}
         </p>
      </div>
       {/* Bottom row: Number/Copy */}
      <div className="flex justify-between items-center mt-2"> 
        <p className="text-muted-foreground text-sm uppercase"> 
          Account Number
        </p>
        <div className="flex items-center space-x-2">
          <p className="text-foreground text-sm">{account.accountNumber}</p> 
          <button
            onClick={() => handleCopyAccountNumber(account.accountNumber)}
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