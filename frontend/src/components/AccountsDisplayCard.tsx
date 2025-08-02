import { useState, useEffect, useMemo } from 'react';
import { Account } from '../types';
import AddAccountView from './AddAccountSheet';
import DraggableBottomSheet from './DraggableBottomSheet';
import AccountDetailsScreen from '../screens/AccountDetailsScreen';
import ParentAccountCard from './ParentAccountCard';
import {
  FiCreditCard,
} from 'react-icons/fi';
import Card from './Card';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAccounts as fetchAccountsRedux } from '../store/slices/accountsSlice';
import AccountCardSkeleton from './skeletons/AccountCardSkeleton';
import { BsWindowPlus } from 'react-icons/bs';
import { useNavigation } from '../hooks/useNavigation';

// Define props for the component
interface AccountsDisplayCardProps {
  title: string;
  accountTypes: Account['type'][]; // Array of account types to display
  emptyStateMessage: string;
}

function AccountsDisplayCard({ title, accountTypes, emptyStateMessage }: AccountsDisplayCardProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const { navigateTo } = useNavigation();
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

  const handleAccountClick = (account: Account, isChild: boolean = false) => {
    navigateTo(<AccountDetailsScreen account={account} getAccountTypeLabel={getAccountTypeLabel} isChild={isChild} />);
  };

  const getAccountTypeLabel = (type: Account['type']) => {
    return type.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <Card>
      <header className="top-0 p-4 pb-3 flex items-center justify-between">
        <h1 className="text-sm text-muted-foreground font-bold">{title}</h1>
        <button onClick={openSheet} className="text-primary font-bold text-xl">
          <BsWindowPlus />
        </button>
      </header>

      <div className="flex-grow overflow-x-auto px-2 gap-2 pb-4 pt-0 flex whitespace-nowrap" style={{ scrollbarWidth: 'none' }}>
        {(status === 'loading' || status === 'idle') && (
          <>
            <AccountCardSkeleton />
            <AccountCardSkeleton />
          </>
        )}

        {status === 'succeeded' && !error && groupedAccounts.map(parentAccount => (
          <ParentAccountCard
            key={parentAccount.id}
            parentAccount={parentAccount}
            onCardClick={(account, isChild) => handleAccountClick(account, isChild)}
          />
        ))}

        {status === 'succeeded' && !error && accounts.length === 0 && (
          <div className="text-center py-8 flex-shrink-0" style={{ width: '100%' }}>
            <FiCreditCard className="h-12 w-12 mb-4 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">{emptyStateMessage}</p>
          </div>
        )}
      </div>

      {/* Add Account Bottom Sheet */}
      <DraggableBottomSheet 
        isOpen={isSheetOpen} 
        onClose={closeSheet} 
        title={"Add New Account"}
      >
        <AddAccountView
          onAccountCreated={handleAccountCreated}
          availableParentAccounts={groupedAccounts}
          prefilledAccountType={accountTypes.length === 1 ? accountTypes[0] : undefined}
        />
      </DraggableBottomSheet>
    </Card>
  );
}

export default AccountsDisplayCard; 