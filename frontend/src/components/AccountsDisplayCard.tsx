import { useState, useEffect, useMemo } from 'react';
import { Account } from '../types';
import AddAccountView from './AddAccountSheet';
import DraggableBottomSheet from './DraggableBottomSheet';
import CustomToast from './CustomToast';
import AccountCard from './AccountCard';
import AccountDetailsModal from './AccountDetailsModal';
import { copyToClipboard } from '../utils/clipboard';
import {
  FiCreditCard, FiAlertTriangle, FiPlus, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import Card from './Card';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAccounts as fetchAccountsRedux } from '../store/slices/accountsSlice';

// Define props for the component
interface AccountsDisplayCardProps {
  title: string;
  accountTypes: Account['type'][]; // Array of account types to display
  emptyStateMessage: string;
}

function AccountsDisplayCard({ title, accountTypes, emptyStateMessage }: AccountsDisplayCardProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({}); // State for expanded parents
  
  const dispatch = useAppDispatch();
  const { accounts: allAccounts, status, error } = useAppSelector(state => state.accounts);

  useEffect(() => {
    if (status === 'idle') {
        dispatch(fetchAccountsRedux());
    }
  }, [status, dispatch]);

  const accounts = useMemo(() => {
    return allAccounts.filter(acc => accountTypes.includes(acc.type));
  }, [allAccounts, accountTypes]);

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
    closeSheet();
  };

  const handleAccountClick = (account: Account) => {
    setSelectedAccount(account);
    setIsDetailsSheetOpen(true);
  };

  const closeDetailsSheet = () => {
    setIsDetailsSheetOpen(false);
    setSelectedAccount(null);
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

  // Function to toggle parent expansion state
  const toggleParentExpansion = (parentId: string) => {
    setExpandedParents(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center bg-background text-foreground">
        <FiAlertTriangle className="h-8 w-8 mt-2 mb-4 text-error" />
        <p className="text-error font-medium">{error || 'Failed to load accounts.'}</p>
        <button
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          onClick={() => dispatch(fetchAccountsRedux())}
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
        {status === 'loading' && (
          <div className="flex justify-center items-center py-2 flex-shrink-0" style={{ width: '100%' }}>
            <p className="text-muted-foreground">Loading accounts...</p>
          </div>
        )}

        {status === 'succeeded' && !error && groupedAccounts.map(parentAccount => {
          const isExpanded = !!expandedParents[parentAccount.id];
          return (
            <div key={parentAccount.id} className="inline-block align-top mr-4 min-w-[280px]">
              <div
                className={`bg-card rounded-2xl overflow-hidden border border-border relative`} // Always rounded, remove conditional border
              >
                <AccountCard
                  account={parentAccount}
                  getBankLogo={getBankLogo}
                  formatCurrency={formatCurrency}
                  getAccountTypeLabel={getAccountTypeLabel}
                  handleCopyAccountNumber={handleCopyAccountNumber}
                  onCardClick={handleAccountClick}
                />
                {/* Add Toggle Button if children exist */}
                {parentAccount.children.length > 0 && (
                  <button
                    onClick={() => toggleParentExpansion(String(parentAccount.id))}
                    className="absolute bottom-2 right-2 p-1 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground"
                    aria-label={isExpanded ? 'Collapse child accounts' : 'Expand child accounts'}
                  >
                    {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                  </button>
                )}
              </div>

              {/* Conditionally render children */}
              {isExpanded && parentAccount.children.length > 0 && (
                <div className="bg-card rounded-2xl overflow-hidden border-l border-r border-b -mt-2 border-border"> {/* Adjust margin/padding */}
                  {parentAccount.children.map((childAccount, index) => (
                    <div key={childAccount.id} className={`${index > 0 ? 'border-t border-border' : ''}`}>
                      <AccountCard
                        account={childAccount}
                        getBankLogo={getBankLogo}
                        formatCurrency={formatCurrency}
                        getAccountTypeLabel={getAccountTypeLabel}
                        handleCopyAccountNumber={handleCopyAccountNumber}
                        onCardClick={handleAccountClick}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {status === 'succeeded' && !error && accounts.length === 0 && (
          <div className="text-center py-8 flex-shrink-0" style={{ width: '100%' }}>
            <FiCreditCard className="h-12 w-12 mb-4 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">{emptyStateMessage}</p>
          </div>
        )}
      </div>

      {/* Add Account Bottom Sheet */}
      <DraggableBottomSheet isOpen={isSheetOpen} onClose={closeSheet} title="Add New Account">
        <AddAccountView
          onAccountCreated={handleAccountCreated}
          availableParentAccounts={groupedAccounts}
        />
      </DraggableBottomSheet>

      {/* Account Details Bottom Sheet */}
      <DraggableBottomSheet isOpen={isDetailsSheetOpen} onClose={closeDetailsSheet} title="Account Details">
        {selectedAccount && (
          <AccountDetailsModal
            account={selectedAccount}
            onClose={closeDetailsSheet}
            formatCurrency={formatCurrency}
            getAccountTypeLabel={getAccountTypeLabel}
          />
        )}
      </DraggableBottomSheet>

      <CustomToast message={toastMessage} isVisible={!!toastMessage} />
    </Card>
  );
}

export default AccountsDisplayCard; 