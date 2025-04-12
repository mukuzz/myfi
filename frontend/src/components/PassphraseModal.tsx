import React, { useState, useEffect } from 'react';
import { FiLock, FiEye, FiEyeOff, FiSave, FiInfo, FiShield } from 'react-icons/fi';
import { generatePassphraseHash, verifyPassphraseHash } from '../utils/cryptoUtils';

// Storage keys
const PASSPHRASE_SET_KEY = 'myfi_passphrase_set';
const PASSPHRASE_HASH_KEY = 'myfi_passphrase_hash';
const PASSPHRASE_SALT_KEY = 'myfi_passphrase_salt';

interface PassphraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPassphraseSubmit: (passphrase: string) => void;
  existingPassphrase: boolean;
}

const PassphraseModal: React.FC<PassphraseModalProps> = ({
  isOpen,
  onClose,
  onPassphraseSubmit,
  existingPassphrase
}) => {
  const [passphrase, setPassphrase] = useState<string>('');
  const [confirmPassphrase, setConfirmPassphrase] = useState<string>('');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setPassphrase('');
      setConfirmPassphrase('');
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const verifyExistingPassphrase = async (passphrase: string): Promise<boolean> => {
    const storedHash = localStorage.getItem(PASSPHRASE_HASH_KEY);
    const storedSalt = localStorage.getItem(PASSPHRASE_SALT_KEY);
    
    if (!storedHash || !storedSalt) {
      // If there's no stored hash or salt, we can't verify
      return true;
    }
    
    return await verifyPassphraseHash(passphrase, storedHash, storedSalt);
  };

  const saveNewPassphrase = async (passphrase: string): Promise<void> => {
    try {
      // Generate a salted hash of the passphrase
      const { hash, salt } = await generatePassphraseHash(passphrase);
      
      // Store the hash and salt (but never the actual passphrase)
      localStorage.setItem(PASSPHRASE_HASH_KEY, hash);
      localStorage.setItem(PASSPHRASE_SALT_KEY, salt);
      localStorage.setItem(PASSPHRASE_SET_KEY, 'true');
    } catch (error) {
      console.error('Error saving passphrase hash:', error);
      throw new Error('Failed to secure your passphrase. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!passphrase) {
      setError('Passphrase is required');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // If we're verifying an existing passphrase
      if (existingPassphrase) {
        const isValid = await verifyExistingPassphrase(passphrase);
        if (!isValid) {
          setError('This passphrase does not match the one previously used. All credentials are encrypted with a different passphrase.');
          setIsProcessing(false);
          return;
        }
      } else {
        // It's a new passphrase, verify requirements
        if (passphrase.length < 8) {
          setError('Passphrase should be at least 8 characters long');
          setIsProcessing(false);
          return;
        }
        
        if (passphrase !== confirmPassphrase) {
          setError('Passphrases do not match');
          setIsProcessing(false);
          return;
        }
        
        // Save the new passphrase hash and salt
        await saveNewPassphrase(passphrase);
      }
      
      // Success - submit the passphrase to the parent component
      onPassphraseSubmit(passphrase);
      
      // Reset form
      setPassphrase('');
      setConfirmPassphrase('');
      setError(null);
    } catch (error) {
      console.error('Passphrase processing error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 rounded-t-xl bg-black/50 flex items-center justify-center z-50 p-2">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-4">
        <div className="flex items-center justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <FiShield className="h-6 w-6" />
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-center mb-2">
          {existingPassphrase ? 'Enter Your Passphrase' : 'Create Encryption Passphrase'}
        </h2>
        
        <p className="text-sm text-muted-foreground text-center mb-6">
          {existingPassphrase 
            ? 'Enter your encryption passphrase to secure your credentials.' 
            : 'This passphrase will be used to encrypt all account credentials. Remember it carefully - there is no way to recover it if forgotten!'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="master-passphrase" className="block text-sm font-medium mb-1">
              {existingPassphrase ? 'Your Passphrase' : 'Create Passphrase'}
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <input
                id="master-passphrase"
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full pl-10 pr-10 p-2 border rounded-md"
                placeholder="Enter secure passphrase"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              >
                {showPassphrase ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          
          {!existingPassphrase && (
            <div>
              <label htmlFor="confirm-passphrase" className="block text-sm font-medium mb-1">
                Confirm Passphrase
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <input
                  id="confirm-passphrase"
                  type={showPassphrase ? 'text' : 'password'}
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  className="w-full pl-10 pr-10 p-2 border rounded-md"
                  placeholder="Confirm your passphrase"
                />
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-3 text-sm bg-error/10 border border-error/30 rounded-md text-error">
              {error}
            </div>
          )}
          
          <div className="p-3 bg-info/10 border border-info/30 rounded-md flex">
            <FiInfo className="h-5 w-5 text-info mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              This passphrase is never stored anywhere. All your credentials are encrypted in your browser with this passphrase. 
              <strong> If you forget it, you'll need to re-enter all credentials again.</strong>
            </p>
          </div>
          
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-input rounded-md hover:bg-muted text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center"
            >
              {isProcessing ? (
                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <FiSave className="mr-2 h-4 w-4" />
                  {existingPassphrase ? 'Unlock' : 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PassphraseModal; 