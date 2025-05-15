import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import { 
  FiEye, FiEyeOff, FiSave, FiTrash2, FiCheckCircle 
} from 'react-icons/fi';
import PassphraseModal from './PassphraseModal';
import { useAppDispatch } from '../store/hooks';
import { deleteAccount as deleteAccountAction } from '../store/slices/accountsSlice';
import CurrencyDisplay from './AmountDisplay';
import { saveCredentials as saveCredentialsApi } from '../services/apiService';

interface AccountDetailsModalProps {
  account: Account;
  onClose: () => void;
  getAccountTypeLabel: (type: Account['type']) => string;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({
  account,
  onClose,
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
  
  // Passphrase states
  const [isPassphraseModalOpen, setIsPassphraseModalOpen] = useState<boolean>(false);
  const [masterKeyInput, setMasterKeyInput] = useState<string>('');

  useEffect(() => {
    return () => {
      if (masterKeyInput) {
        setMasterKeyInput('');
        console.log('Master key input cleared on unmount');
      }
    };
  }, [masterKeyInput]);

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
        onClose();
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
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      
      {/* Account Information */}
      <div className="pb-4 mb-6 border-b">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Account Name</p>
            <p className="font-medium">{account.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Account Type</p>
            <p className="font-medium">{getAccountTypeLabel(account.type)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Account Number</p>
            <p className="font-medium">{account.accountNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <CurrencyDisplay 
              amount={account.balance} 
              className="font-medium"
            />
          </div>
        </div>
      </div>
      
      {/* Credentials Form */}
      {!account.isEmailScrapingSupported && (
        <div className="flex-1">
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
        <p className="text-sm text-muted-foreground">Credit Card Updated through Gmail</p>
      )}
      
      {/* Delete Account Section */}
      <div className="mt-6 pt-4 border-t">
        <h3 className="text-lg font-medium mb-2 text-error">Danger Zone</h3>
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
  );
};

export default AccountDetailsModal; 