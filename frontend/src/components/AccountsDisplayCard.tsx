import { useState, useEffect, useCallback, useMemo } from 'react';
import { Account } from '../types';
import { fetchAccounts } from '../services/apiService';
import AddAccountView from './AddAccountSheet';
import DraggableBottomSheet from './DraggableBottomSheet';
import CustomToast from './CustomToast';
import AccountCard from './AccountCard';
import { copyToClipboard } from '../utils/clipboard';
import {
  FiCreditCard, FiAlertTriangle, FiPlus
} from 'react-icons/fi';
import Card from './Card';

// Define props for the component
interface AccountsDisplayCardProps {
  title: string;
  accountTypes: Account['type'][]; // Array of account types to display
  emptyStateMessage: string;
}

function AccountsDisplayCard({ title, accountTypes, emptyStateMessage }: AccountsDisplayCardProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchAccounts();
      // Filter accounts based on the provided types
      const filteredAccounts = data.filter(acc => accountTypes.includes(acc.type));
      setAccounts(filteredAccounts);
      setError(null);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [accountTypes]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const groupedAccounts = useMemo(() => {
    const parents = accounts.filter(acc => acc.parentAccountId === null || acc.parentAccountId === undefined);
    const childrenMap = accounts.reduce((acc, current) => {
      if (current.parentAccountId) {
        if (!acc[current.parentAccountId]) {
          acc[current.parentAccountId] = [];
        }
        acc[current.parentAccountId].push(current);
      }
      return acc;
    }, {} as Record<string, Account[]>);

    return parents.map(parent => ({
      ...parent,
      children: childrenMap[parent.id] || []
    }));
  }, [accounts]);

  const openSheet = () => setIsSheetOpen(true);
  const closeSheet = () => setIsSheetOpen(false);

  const handleAccountCreated = (newAccount: Account) => {
    loadAccounts();
    closeSheet();
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
        <div className="bg-muted px-2 py-1 rounded">
          {bankName.charAt(0).toUpperCase()}
        </div>
      </div>
    );
  };

  const handleCopyAccountNumber = async (accountNumber: string) => {
    try {
      await copyToClipboard(accountNumber);
      setToastMessage('Account number copied');
    } catch (err) {
      console.error('Copy failed:', err);
      setToastMessage('Failed to copy account number');
    } finally {
      setTimeout(() => setToastMessage(null), 1000);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-background text-foreground">
        <FiAlertTriangle className="h-8 w-8 mt-2 mb-4 text-error" />
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
    <Card>
      <header className="top-0 z-10 bg-background pl-4 border-b border-border flex items-center justify-between">
        <h1 className="text-xs font-bold">{title}</h1>
        <button onClick={openSheet} className="text-primary text-lg p-2">
          <FiPlus />
        </button>
      </header>

      <div className="flex-grow overflow-x-auto p-3 flex whitespace-nowrap">
        {isLoading && (
          <div className="flex justify-center items-center py-2 flex-shrink-0" style={{ width: '100%' }}>
            <p className="text-muted-foreground">Loading accounts...</p>
          </div>
        )}

        {!isLoading && !error && groupedAccounts.map(parentAccount => (
          <div key={parentAccount.id} className="inline-block align-top mr-4" style={{ width: '320px' }}>
            <div
              className={`bg-card ${parentAccount.children.length > 0 ? 'rounded-t-2xl border-b-0' : 'rounded-2xl'} overflow-hidden shadow border border-border`}
            >
              <AccountCard
                account={parentAccount}
                getBankLogo={getBankLogo}
                formatCurrency={formatCurrency}
                getAccountTypeLabel={getAccountTypeLabel}
                handleCopyAccountNumber={handleCopyAccountNumber}
              />
            </div>

            {parentAccount.children.length > 0 && (
              <div className="bg-muted/20 text-center py-1 border-l border-r border-border">
                <p className="text-xs text-muted-foreground font-medium">Linked Accounts</p>
              </div>
            )}

            {parentAccount.children.length > 0 && (
              <div className="bg-card shadow rounded-b-2xl overflow-hidden border-l border-r border-b border-border border-t-0">
                {parentAccount.children.map((childAccount, index) => (
                  <div key={childAccount.id} className={`${index > 0 ? 'border-t border-border' : ''}`}>
                    <AccountCard
                      account={childAccount}
                      getBankLogo={getBankLogo}
                      formatCurrency={formatCurrency}
                      getAccountTypeLabel={getAccountTypeLabel}
                      handleCopyAccountNumber={handleCopyAccountNumber}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {!isLoading && !error && accounts.length === 0 && (
          <div className="text-center py-8 flex-shrink-0" style={{ width: '100%' }}>
            <FiCreditCard className="h-12 w-12 mb-4 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">{emptyStateMessage}</p>
          </div>
        )}
      </div>

      <DraggableBottomSheet isOpen={isSheetOpen} onClose={closeSheet}>
        <AddAccountView
          onAccountCreated={handleAccountCreated}
          availableParentAccounts={groupedAccounts}
        />
      </DraggableBottomSheet>

      <CustomToast message={toastMessage} isVisible={!!toastMessage} />
    </Card>
  );
}

export default AccountsDisplayCard; 