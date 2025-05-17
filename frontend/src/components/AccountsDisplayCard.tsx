import { useState, useEffect, useMemo } from 'react';
import { Account } from '../types';
import AddAccountView from './AddAccountSheet';
import DraggableBottomSheet from './DraggableBottomSheet';
import CustomToast from './CustomToast';
import AccountCard from './AccountCard';
import AccountDetailsModal from './AccountDetailsModal';
import { copyToClipboard } from '../utils/clipboard';
import {
  FiCreditCard, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import Card from './Card';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAccounts as fetchAccountsRedux } from '../store/slices/accountsSlice';
import AccountCardSkeleton from './skeletons/AccountCardSkeleton';
import { BsWindowPlus } from 'react-icons/bs';

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

  return (
    <Card>
      <header className="top-0 bg-background p-4 pb-3 flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground font-bold">{title}</h1>
        <button onClick={openSheet} className="text-primary font-bold text-xl">
          <BsWindowPlus />
        </button>
      </header>

      <div className="flex-grow overflow-x-auto px-2 pb-4 pt-0 flex whitespace-nowrap" style={{ scrollbarWidth: 'none' }}>
        {(status === 'loading' || status === 'idle') && (
          <>
            <AccountCardSkeleton />
            <AccountCardSkeleton />
          </>
        )}

        {status === 'succeeded' && !error && groupedAccounts.map(parentAccount => {
          const isExpanded = !!expandedParents[parentAccount.id];
          return (
            <div key={parentAccount.id} className="inline-block align-top mr-2 min-w-[280px]">
              <div
                className={`bg-card rounded-2xl overflow-hidden border border-border relative`} // Always rounded, remove conditional border
              >
                <AccountCard
                  account={parentAccount}
                  getBankLogo={getBankLogo}
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
            getAccountTypeLabel={getAccountTypeLabel}
          />
        )}
      </DraggableBottomSheet>

      <CustomToast message={toastMessage} isVisible={!!toastMessage} />
    </Card>
  );
}

export default AccountsDisplayCard; 