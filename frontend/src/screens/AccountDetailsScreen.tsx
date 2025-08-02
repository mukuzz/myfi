import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import {
  FiTrash2
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { deleteAccount as deleteAccountAction } from '../store/slices/accountsSlice';
import { fetchTransactionsByAccount } from '../store/slices/transactionsSlice';
import ScreenContainer from '../components/ScreenContainer';
import { useNavigation } from '../hooks/useNavigation';
import ParentAccountCard from '../components/ParentAccountCard';
import TransactionList from '../components/TransactionList';

interface AccountDetailsScreenProps {
  account: Account;
  getAccountTypeLabel: (type: Account['type']) => string;
}


const AccountDetailsScreen: React.FC<AccountDetailsScreenProps> = ({
  account,
  getAccountTypeLabel,
}) => {
  const dispatch = useAppDispatch();

  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { goBack } = useNavigation();


  // Transactions state
  const { transactions, status: transactionsStatus, error: transactionsError } = useAppSelector((state) => state.transactions);

  // Filter transactions for this specific account
  // Include transactions from this account and all its child accounts
  const accountTransactions = transactions.filter(tx => {
    // Direct match
    if (tx.account?.id === account.id) return true;
    // Child account match (if parentAccount exists and matches)
    if (tx.account?.parentAccountId && tx.account.parentAccountId === account.id) return true;
    return false;
  });


  // Fetch transactions for this account when component mounts
  useEffect(() => {
    // Only fetch if we don't have any transactions for this account and we're not already loading
    if (accountTransactions.length === 0 && transactionsStatus === 'idle') {
      dispatch(fetchTransactionsByAccount({ accountId: account.id }));
    }
  }, [dispatch, account.id, accountTransactions.length, transactionsStatus]);




  const handleDeleteAccount = async () => {
    setDeleteError(null);
    const confirmationMessage = `Are you sure you want to delete the account "${account.name}"? This action cannot be undone and will also delete all associated transactions.`;

    if (window.confirm(confirmationMessage)) {
      setIsDeleting(true);
      try {
        await dispatch(deleteAccountAction(account.id.toString())).unwrap();
        goBack();
        console.log(`Account ${account.id} deleted successfully via modal.`);
      } catch (error: any) {
        console.error('Failed to delete account:', error);
        const message = error?.message || 'Failed to delete account. Please try again.';
        setDeleteError(message);
        setIsDeleting(false);
      }
    }
  };

  return (
    <ScreenContainer title="Account Details">
      <div className='flex justify-center flex-row flex-wrap'>
        <div className="h-full flex flex-col justify-start items-start overflow-y-auto w-full sm:max-w-[350px]">
          <div className="flex-shrink-0 flex flex-row justify-start items-stretch overflow-x-auto w-full relative">
            <div className="p-6 flex-shrink-0 flex flex-row justify-start items-stretch overflow-x-auto w-full relative">
              <ParentAccountCard parentAccount={account} />
            </div>
            <span className="absolute hidden sm:block flex-shrink-0 left-0 h-full w-6 bg-gradient-to-r from-background to-transparent" />
            <span className="absolute hidden sm:block flex-shrink-0 right-0 h-full w-6 bg-gradient-to-l from-background to-transparent" />
          </div>


          {/* Delete Account Section */}
          <div className="p-6 pb-6 max-w-sm w-full">
            <hr />
            <h3 className="text-lg font-medium mt-6 mb-2 text-error">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting this account will permanently remove it along with all associated transactions. This action cannot be undone.
            </p>
            {deleteError && (
              <div className="mb-4 p-3 text-sm bg-error/10 border border-error/30 rounded-md text-error">
                {deleteError}
              </div>
            )}
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="w-full py-2 px-4 border border-error text-error rounded-md hover:bg-error/10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-2"></div>
              ) : (
                <FiTrash2 className="mr-2 h-4 w-4" />
              )}
              Delete Account
            </button>
          </div>

        </div>
        <div className="p-1 flex-1 w-full md:max-w-[350px]">
          {transactionsStatus === 'loading' && accountTransactions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading transactions...
            </div>
          ) : accountTransactions.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No transactions found for this account.
            </div>
          ) : transactionsError ? (
            <div className="p-4 text-center text-error">
              Error loading transactions: {transactionsError}
            </div>
          ) : (
            <TransactionList transactions={accountTransactions} />
          )}
        </div>
      </div>

    </ScreenContainer>
  );
};

export default AccountDetailsScreen; 