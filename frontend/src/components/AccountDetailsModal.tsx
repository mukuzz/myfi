import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import { 
  FiEye, FiEyeOff, FiSave, FiTrash2, 
  FiAlertCircle, FiCheckCircle 
} from 'react-icons/fi';
import { encryptCredentials } from '../utils/cryptoUtils';
import PassphraseModal from './PassphraseModal';

const NETBANKING_STORAGE_PREFIX = 'myfi_credential_';
const PASSPHRASE_SET_KEY = 'myfi_passphrase_set';

interface AccountDetailsModalProps {
  account: Account;
  onClose: () => void;
  formatCurrency: (amount: number, currency: string) => string;
  getAccountTypeLabel: (type: Account['type']) => string;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({
  account,
  onClose,
  formatCurrency,
  getAccountTypeLabel
}) => {
  // States for form fields and UI
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [hasStoredCredentials, setHasStoredCredentials] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Passphrase states
  const [isPassphraseModalOpen, setIsPassphraseModalOpen] = useState<boolean>(false);
  const [encryptionPassphrase, setEncryptionPassphrase] = useState<string>('');
  const [hasPassphrase, setHasPassphrase] = useState<boolean>(false);

  // Check if credentials exist on mount
  useEffect(() => {
    const storageKey = `${NETBANKING_STORAGE_PREFIX}${account.id}`;
    const hasCredentials = localStorage.getItem(storageKey) !== null;
    setHasStoredCredentials(hasCredentials);
    
    // Check if passphrase has been set before
    const hasPassphraseSet = localStorage.getItem(PASSPHRASE_SET_KEY) === 'true';
    setHasPassphrase(hasPassphraseSet);
  }, [account.id]);

  // Security: Clear passphrase from memory on component unmount
  useEffect(() => {
    return () => {
      if (encryptionPassphrase) {
        setEncryptionPassphrase('');
        console.log('Passphrase cleared on unmount');
      }
    };
  }, [encryptionPassphrase]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setErrorMessage('Both username and password are required.');
      return;
    }

    setSaveStatus('saving');
    setErrorMessage(null);

    // If we don't have a passphrase yet or it's not in memory, request it
    if (!encryptionPassphrase) {
      setIsPassphraseModalOpen(true);
    } else {
      // We already have the passphrase in memory, use it directly
      proceedWithEncryption(encryptionPassphrase);
    }
  };

  const handlePassphraseSubmit = (passphrase: string) => {
    setEncryptionPassphrase(passphrase);
    setIsPassphraseModalOpen(false);
    
    // Mark that a passphrase has been set
    setHasPassphrase(true);
    localStorage.setItem(PASSPHRASE_SET_KEY, 'true');
    
    // Proceed with encryption using the submitted passphrase
    proceedWithEncryption(passphrase);
  };

  const proceedWithEncryption = async (passphrase: string) => {
    try {
      // Encrypt the credentials with the provided passphrase
      const encryptedData = await encryptCredentials(username, password, passphrase);
      
      // Store in localStorage
      const storageKey = `${NETBANKING_STORAGE_PREFIX}${account.id}`;
      localStorage.setItem(storageKey, JSON.stringify(encryptedData));
      
      // Update UI
      setSaveStatus('success');
      setHasStoredCredentials(true);
      
      // Reset sensitive fields (keep username visible for UX)
      setPassword('');
      
      // Reset status after a delay
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
      
      // Clear the passphrase from memory after use
      setTimeout(() => {
        setEncryptionPassphrase('');
        console.log('Passphrase cleared from memory for security');
      }, 1000); // Clear after 1 second to ensure encryption completes
    } catch (error) {
      console.error('Failed to encrypt credentials:', error);
      setSaveStatus('error');
      setErrorMessage('Failed to encrypt credentials. Please try again.');
    }
  };

  const handleDeleteCredentials = () => {
    if (window.confirm('Are you sure you want to delete the stored credentials for this account?')) {
      const storageKey = `${NETBANKING_STORAGE_PREFIX}${account.id}`;
      localStorage.removeItem(storageKey);
      setHasStoredCredentials(false);
      setUsername('');
      setPassword('');
      setSaveStatus('idle');
      setErrorMessage(null);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="pb-4 mb-4 border-b">
        <h2 className="text-xl font-semibold">Account Details</h2>
      </div>
      
      {/* Account Information */}
      <div className="pb-4 mb-4 border-b">
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
            <p className="font-medium">{formatCurrency(account.balance, account.currency)}</p>
          </div>
        </div>
      </div>
      
      {/* Credentials Form */}
      <div className="flex-1">
        <h3 className="text-lg font-medium mb-4">
          {hasStoredCredentials ? 'Update Credentials' : 'Add Credentials'}
        </h3>
        
        {hasStoredCredentials && (
          <div className="mb-4 p-3 bg-info/10 border border-info/30 rounded-md">
            <p className="text-sm flex items-center">
              <FiAlertCircle className="mr-2 h-4 w-4 text-info" />
              This account has encrypted credentials stored on your device.
            </p>
          </div>
        )}
        
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
            {hasStoredCredentials && (
              <button
                type="button"
                onClick={handleDeleteCredentials}
                className="flex-1 py-2 px-4 border border-error text-error rounded-md hover:bg-error/10 flex items-center justify-center"
              >
                <FiTrash2 className="mr-2 h-4 w-4" />
                Delete Credentials
              </button>
            )}
            
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
                  {hasStoredCredentials ? 'Update Credentials' : 'Save Credentials'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Passphrase Modal */}
      <PassphraseModal
        isOpen={isPassphraseModalOpen}
        onClose={() => {
          setIsPassphraseModalOpen(false);
          
          // Also clear passphrase if modal is closed without submission
          if (encryptionPassphrase) {
            setEncryptionPassphrase('');
          }
          
          // Reset save status if modal is closed
          setSaveStatus('idle');
        }}
        onPassphraseSubmit={handlePassphraseSubmit}
        existingPassphrase={hasPassphrase}
      />
    </div>
  );
};

export default AccountDetailsModal; 