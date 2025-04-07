import React, { useState, useEffect, useCallback } from 'react';
import { Account } from '../types';
import { fetchAccounts } from '../services/apiService';
import AddAccountView from './AddAccountSheet';
import DraggableBottomSheet from './DraggableBottomSheet';
import CustomToast from './CustomToast';
import { 
  FiCreditCard, FiDollarSign, FiTrendingUp, FiLock, FiAward, 
  FiDatabase, FiHash, FiAlertTriangle, FiRefreshCw, 
  FiChevronLeft, FiChevronRight, FiPlus, FiCopy
} from 'react-icons/fi';

function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      if (!isLoading) setIsLoading(true);
      const data = await fetchAccounts();
      setAccounts(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const openSheet = () => setIsSheetOpen(true);
  const closeSheet = () => setIsSheetOpen(false);

  const handleAccountCreated = (newAccount: Account) => {
    loadAccounts();
    closeSheet();
  };

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'SAVINGS':
        return <FiDollarSign className="h-5 w-5" />;
      case 'CREDIT_CARD':
        return <FiCreditCard className="h-5 w-5" />;
      case 'LOAN':
        return <FiAlertTriangle className="h-5 w-5" />;
      case 'STOCKS':
        return <FiTrendingUp className="h-5 w-5" />;
      case 'FIXED_DEPOSIT':
        return <FiLock className="h-5 w-5" />;
      case 'MUTUAL_FUND':
        return <FiAward className="h-5 w-5" />;
      case 'CRYPTO':
        return <FiHash className="h-5 w-5" />;
      default:
        return <FiDatabase className="h-5 w-5" />;
    }
  };

  const getAccountTypeLabel = (type: Account['type']) => {
    return type.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBankLogo = (bankName: string) => {
    return (
      <div className="w-10 h-10 flex items-center justify-center text-primary">
        <div className="bg-secondary p-1 rounded">
          {bankName.charAt(0)}
        </div>
      </div>
    );
  };

  const handleCopyAccountNumber = (accountNumber: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      // Use modern Clipboard API if available
      navigator.clipboard.writeText(accountNumber)
        .then(() => {
          setToastMessage('Account number copied');
          setTimeout(() => setToastMessage(null), 1000);
        })
        .catch(err => {
          console.error('Failed to copy using Clipboard API: ', err);
          setToastMessage('Failed to copy account number');
          setTimeout(() => setToastMessage(null), 1000);
        });
    } else {
      // Fallback for older browsers/environments
      try {
        const textArea = document.createElement('textarea');
        textArea.value = accountNumber;
        // Make the textarea invisible
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          setToastMessage('Account number copied');
          setTimeout(() => setToastMessage(null), 1000);
        } else {
          throw new Error('execCommand returned false');
        }
      } catch (err) {
        console.error('Fallback copy failed: ', err);
        setToastMessage('Failed to copy account number');
        setTimeout(() => setToastMessage(null), 1000);
      }
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <FiAlertTriangle className="h-8 w-8 mb-4 text-error" />
        <p className="text-error font-medium">{error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          onClick={loadAccounts}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <header className="top-0 z-10 bg-background p-4 border-b border-border flex items-center justify-between">
        <h1 className="text-3xl font-bold">Accounts</h1>
        <button onClick={openSheet} className="text-primary text-2xl">
          <FiPlus />
        </button>
      </header>

      <div className="flex-grow overflow-y-auto p-4 pb-16">
        {isLoading && (
            <div className="flex justify-center items-center py-2">
                <p className="text-muted-foreground">Loading accounts...</p>
            </div>
        )}

        {!isLoading && !error && accounts.map(account => (
          <div 
            key={account.id} 
            className="mb-4 bg-card rounded-2xl overflow-hidden shadow border border-border"
          >
            <div className="p-4">
              <div className="flex justify-between items-center">
                {getBankLogo(account.name)}
                <p className="text-lg font-semibold text-right">{formatCurrency(account.balance, account.currency)}</p>
              </div>
              
              <div className="flex justify-between items-center mt-6">
                <h2 className="text-xl font-bold  text-foreground">
                    {account.name}
                </h2>
                <p className="text-foreground text-xs bg-secondary px-2 py-1 rounded-full">
                  {getAccountTypeLabel(account.type)}
                </p>
              </div>
              
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
          </div>
        ))}
      
        {!isLoading && !error && accounts.length === 0 && (
          <div className="text-center py-8">
            <FiCreditCard className="h-12 w-12 mb-4 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No accounts found</p>
          </div>
        )}
      </div>
      
      <DraggableBottomSheet isOpen={isSheetOpen} onClose={closeSheet}>
        <AddAccountView
          onAccountCreated={handleAccountCreated} 
          availableParentAccounts={accounts.filter(acc => acc.parentAccountId === null || acc.parentAccountId === undefined)}
        />
      </DraggableBottomSheet>

      <CustomToast message={toastMessage} isVisible={!!toastMessage} />
    </div>
  );
}

export default Accounts; 