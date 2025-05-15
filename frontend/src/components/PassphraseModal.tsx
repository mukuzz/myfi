import React, { useState, useEffect } from 'react';
import { FiLock, FiEye, FiEyeOff, FiSave, FiInfo, FiShield } from 'react-icons/fi';

interface PassphraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPassphraseSubmit: (passphrase: string) => void;
}

const PassphraseModal: React.FC<PassphraseModalProps> = ({
  isOpen,
  onClose,
  onPassphraseSubmit,
}) => {
  const [passphrase, setPassphrase] = useState<string>('');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setPassphrase('');
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passphrase) {
      setError('Passphrase is required');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    onPassphraseSubmit(passphrase);
    
    setIsProcessing(false);
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
        
        
        

        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <input
                id="master-passphrase"
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full pl-10 pr-10 p-2 border rounded-md"
                placeholder="Enter Master key"
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
          
          {error && (
            <div className="p-3 text-sm bg-error/10 border border-error/30 rounded-md text-error">
              {error}
            </div>
          )}
          
          <div className="p-3 bg-info/10 border border-info/30 rounded-md flex">
            <FiInfo className="h-5 w-5 text-info mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
            This key will be used to encrypt the account credentials. Store it in a password manager - there is no way to recover it if forgotten!
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
                  Submit
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