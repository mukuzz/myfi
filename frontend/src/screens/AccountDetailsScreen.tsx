import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import {
  FiEye, FiEyeOff, FiSave, FiTrash2, FiCheckCircle
} from 'react-icons/fi';
import PassphraseModal from '../components/PassphraseModal';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { deleteAccount as deleteAccountAction } from '../store/slices/accountsSlice';
import { fetchTransactionsByAccount } from '../store/slices/transactionsSlice';
import { saveCredentials as saveCredentialsApi } from '../services/apiService';
import ScreenContainer from '../components/ScreenContainer';
import { useNavigation } from '../hooks/useNavigation';
import ParentAccountCard from '../components/ParentAccountCard';
import TransactionList from '../components/TransactionList';

interface AccountDetailsScreenProps {
  account: Account;
  getAccountTypeLabel: (type: Account['type']) => string;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

const AccountDetailsScreen: React.FC<AccountDetailsScreenProps> = ({
  account,
  getAccountTypeLabel,
}) => {
  const dispatch = useAppDispatch();

  // States for form fields and UI
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { goBack } = useNavigation();

  // Passphrase states
  const [isPassphraseModalOpen, setIsPassphraseModalOpen] = useState<boolean>(false);
  const [masterKeyInput, setMasterKeyInput] = useState<string>('');

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

  useEffect(() => {
    return () => {
      if (masterKeyInput) {
        setMasterKeyInput('');
        console.log('Master key input cleared on unmount');
      }
    };
  }, [masterKeyInput]);

  // Fetch transactions for this account when component mounts
  useEffect(() => {
    // Only fetch if we don't have any transactions for this account and we're not already loading
    if (accountTransactions.length === 0 && transactionsStatus === 'idle') {
      dispatch(fetchTransactionsByAccount({ accountId: account.id }));
    }
  }, [dispatch, account.id, accountTransactions.length, transactionsStatus]);

  const proceedWithSaveCredentials = async (currentMasterKey: string) => {
    if (!currentMasterKey) {
      setErrorMessage('Master key is required to save credentials.');
      setSaveStatus('error');
      return;
    }
    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      await saveCredentialsApi(account.accountNumber, account.name, username, password, currentMasterKey);
      setSaveStatus('success');
      setPassword('');
      setUsername('');

      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);

      setTimeout(() => {
        setMasterKeyInput('');
        console.log('Master key input cleared after successful save.');
      }, 1000);

    } catch (error: any) {
      console.error('Failed to save credentials:', error);
      setSaveStatus('error');
      const message = error?.message || 'Failed to save credentials. Please try again.';
      setErrorMessage(message);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setErrorMessage('Both username and password are required.');
      return;
    }

    if (!masterKeyInput) {
      setIsPassphraseModalOpen(true);
    } else {
      proceedWithSaveCredentials(masterKeyInput);
    }
  };

  const handlePassphraseSubmit = (passphrase: string) => {
    setMasterKeyInput(passphrase);
    setIsPassphraseModalOpen(false);

    proceedWithSaveCredentials(passphrase);
  };

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
              <ParentAccountCard parentAccount={account} onCardClick={() => { }} />
            </div>
            <span className="absolute hidden sm:block flex-shrink-0 left-0 h-full w-6 bg-gradient-to-r from-background to-transparent" />
            <span className="absolute hidden sm:block flex-shrink-0 right-0 h-full w-6 bg-gradient-to-l from-background to-transparent" />
          </div>

          {/* Credentials Form */}
          {!account.isEmailScrapingSupported && (
            <div className="px-6 w-full max-w-sm">
              <h3 className="text-lg font-medium mb-4">
                Set Credentials
              </h3>

              <form onSubmit={handleSaveCredentials} className="space-y-4">
                {/* Username field */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium mb-1">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="Bank username"
                  />
                </div>

                {/* Password field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-2 border rounded-md pr-10"
                      placeholder="Bank password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {errorMessage && (
                  <div className="p-3 text-sm bg-error/10 border border-error/30 rounded-md text-error">
                    {errorMessage}
                  </div>
                )}

                {/* Success message */}
                {saveStatus === 'success' && (
                  <div className="p-3 text-sm bg-success/10 border border-success/30 rounded-md text-success flex items-center">
                    <FiCheckCircle className="mr-2 h-4 w-4" />
                    Credentials saved successfully!
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-3 pt-4 pb-6">
                  <button
                    type="submit"
                    disabled={saveStatus === 'saving'}
                    className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center disabled:opacity-50"
                  >
                    {saveStatus === 'saving' ? (
                      <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                    ) : (
                      <>
                        <FiSave className="mr-2 h-4 w-4" />
                        Save Credentials
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {account.isEmailScrapingSupported && (
            <p className="text-sm px-6 text-muted-foreground">Account updated through email updates</p>
          )}

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

          {/* Passphrase Modal */}
          <PassphraseModal
            isOpen={isPassphraseModalOpen}
            onClose={() => {
              setIsPassphraseModalOpen(false);
              if (saveStatus === 'saving') {
                setSaveStatus('idle');
              }
            }}
            onPassphraseSubmit={handlePassphraseSubmit}
          />
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