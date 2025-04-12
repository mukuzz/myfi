import React, { useState, useCallback, useRef } from 'react';
import { fetchAccounts, triggerScraping } from '../services/apiService';
import { Account, ScrapeRequest } from '../types';
import { FiRefreshCw, FiLoader, FiXCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { formatDistanceToNow } from '../utils/datetimeUtils';
// Import the crypto utility and the data interface
import { decryptCredentials, EncryptedCredentialData } from '../utils/cryptoUtils';
// Import PassphraseModal
import PassphraseModal from './PassphraseModal';

// Key prefix for local storage (use a consistent prefix)
const NETBANKING_STORAGE_PREFIX = 'myfi_credential_'; // Changed prefix slightly for clarity

interface RefreshSheetContentProps {
  onClose: () => void;
  lastRefreshTime: number | null;
  onRefreshSuccess: () => void;
}

type RefreshStatus = 'idle' | 'prompting' | 'loading' | 'success' | 'error';

function RefreshSheetContent({ onClose, lastRefreshTime, onRefreshSuccess }: RefreshSheetContentProps) {
  const [status, setStatus] = useState<RefreshStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPassphraseModalOpen, setIsPassphraseModalOpen] = useState<boolean>(false);
  // Ref to store accounts that need credentials for decryption later
  const accountsToRefreshRef = useRef<Account[]>([]);

  // Function to check which accounts have stored credentials
  const checkForRefreshableAccounts = useCallback(async () => {
    setStatus('loading'); // Initial loading state while checking
    setErrorMessage(null);
    accountsToRefreshRef.current = []; // Clear previous list

    try {
      const allAccounts = await fetchAccounts();
      if (!allAccounts || allAccounts.length === 0) {
        setErrorMessage('No accounts configured.');
        setStatus('idle');
        return;
      }

      const refreshableAccounts = allAccounts.filter(account => {
        const storageKey = `${NETBANKING_STORAGE_PREFIX}${account.id}`; // Use account ID as key
        return localStorage.getItem(storageKey) !== null;
      });

      if (refreshableAccounts.length === 0) {
        setErrorMessage('No accounts found with saved credentials to refresh.');
        setStatus('idle');
      } else {
        accountsToRefreshRef.current = refreshableAccounts;
        // Show passphrase modal instead of changing status to 'prompting'
        setIsPassphraseModalOpen(true);
      }
    } catch (err: any) {
      console.error('Failed to fetch accounts:', err);
      setErrorMessage(err.message || 'Failed to check accounts. Please try again.');
      setStatus('error');
    }
  }, []);

  // Handle passphrase submission from the PassphraseModal
  const handlePassphraseSubmit = useCallback(async (passphrase: string) => {
    setIsPassphraseModalOpen(false);
    setStatus('loading');
    setErrorMessage(null);

    const scrapeRequests: ScrapeRequest[] = [];
    let decryptionFailed = false;

    for (const account of accountsToRefreshRef.current) {
      const storageKey = `${NETBANKING_STORAGE_PREFIX}${account.id}`;
      const storedDataString = localStorage.getItem(storageKey);

      if (storedDataString) {
        try {
          const encryptedData: EncryptedCredentialData = JSON.parse(storedDataString);
          // Decrypt using the utility function
          const { username, password } = await decryptCredentials(encryptedData, passphrase);

          // Add PLAINTEXT credentials to the request list
          scrapeRequests.push({
            accountId: account.id,
            accountType: account.type,
            accountName: account.name,
            username,
            password,
            accountNumber: account.accountNumber, // Keep for potential backend use
          });
           // IMPORTANT: Clear plaintext password from memory ASAP
           // (JavaScript memory management makes guarantees hard, but avoid holding onto it)
           // password = null; // Attempt to nullify

        } catch (error: any) {
          console.error(`Decryption failed for account ${account.name} (${account.id}):`, error);
          setErrorMessage(error.message || `Decryption failed for account ${account.name}. Check passphrase.`);
          setStatus('error');
          decryptionFailed = true;
          break; // Stop processing further accounts on decryption failure
        }
      }
    }

    if (decryptionFailed) {
        accountsToRefreshRef.current = []; // Clear accounts list on failure
        return; // Stop if decryption failed
    }

    if (scrapeRequests.length === 0) {
      setStatus('idle'); // Or 'prompting' again?
      setErrorMessage('No credentials could be decrypted or prepared for refresh.');
      accountsToRefreshRef.current = [];
      return;
    }

    try {
      // 3. Call the scraping API with PLAINTEXT credentials
      console.log('Triggering scraping for:', scrapeRequests.map(r => ({ ...r, password: '***' }))); // Log without password
      await triggerScraping(scrapeRequests);

      setStatus('success');
      onRefreshSuccess();

      setTimeout(() => {
        setStatus('idle');
        setErrorMessage(null);
        accountsToRefreshRef.current = []; // Clear accounts list
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('Failed to trigger scraping:', err);
      // If the API returns specific errors (e.g., bad credentials during scrape), display them.
      // For now, show a generic message.
      let apiErrorMessage = 'Scraping request failed. Please check backend logs.';
      if (err.response && err.response.data && err.response.data.message) {
          apiErrorMessage = err.response.data.message;
      } else if (err.message) {
          apiErrorMessage = err.message;
      }
      setErrorMessage(apiErrorMessage);
      setStatus('error');
      accountsToRefreshRef.current = []; // Clear accounts list
    }
  }, [onClose, onRefreshSuccess]);

  // Handle closing the passphrase modal without submitting
  const handleClosePassphraseModal = useCallback(() => {
    setIsPassphraseModalOpen(false);
    setStatus('idle');
  }, []);

 const renderContent = () => {
    switch (status) {
        case 'loading':
             return (
                <div className="flex flex-col items-center justify-center">
                    <FiLoader className="animate-spin h-8 w-8 text-primary mb-4" />
                    <p className="text-muted-foreground">
                        Decrypting and refreshing...
                     </p>
                </div>
            );
        case 'success':
             return (
                <div className="flex flex-col items-center justify-center text-center">
                    <FiCheckCircle className="h-8 w-8 text-success mb-4" />
                    <p className="font-semibold text-success">Refresh Successful!</p>
                    <p className="text-sm text-muted-foreground mt-1">Transactions will appear soon.</p>
                 </div>
             );
        case 'error':
            return (
                <div className="flex flex-col items-center justify-center text-center w-full max-w-xs">
                    <FiXCircle className="h-8 w-8 text-error mb-4" />
                     <p className="font-semibold text-error mb-2">Refresh Failed</p>
                    {errorMessage && (
                        <div className="bg-error/10 text-error border border-error/30 rounded-md p-3 mb-4 text-sm w-full text-center">
                            {errorMessage}
                        </div>
                    )}
                     <button
                        onClick={checkForRefreshableAccounts} // Allow retry by going back to prompt
                        className={`mt-2 py-2 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary`}
                     >
                         Try Again
                     </button>
                 </div>
             );
        case 'idle':
        default:
            return (
                <div className="flex flex-col items-center justify-center text-center">
                    {errorMessage && ( // For messages like "no accounts found"
                         <div className="bg-info/10 text-info border border-info/30 rounded-md p-3 mb-4 text-sm w-full max-w-xs text-center">
                             {errorMessage}
                         </div>
                     )}
                     <p className="text-sm text-muted-foreground mb-6 text-center px-4">
                        Check for accounts with saved credentials and initiate refresh.
                    </p>
                    <button
                        onClick={checkForRefreshableAccounts}
                        className={`w-full max-w-xs py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary`}
                    >
                        <FiRefreshCw className="mr-2 h-5 w-5" />
                        Start Refresh
                    </button>
                </div>
            );
    }
 };


  return (
    // Increased height and padding for better layout
    <div className="p-6 pt-8 flex-grow flex flex-col h-[50vh] min-h-[400px]">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
            <h2 className="text-xl font-semibold">Account Refresh</h2>
            {/* Optional: Add a close button */}
             <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted">
                 <FiXCircle size={20}/>
             </button>
        </div>

        <div className="flex-grow overflow-y-auto flex flex-col justify-center items-center">
            {/* Display Last Refresh Time - moved above the main content area */}
            <div className="mb-6 text-center flex-shrink-0">
                {lastRefreshTime ? (
                    <>
                        <p className="text-sm text-muted-foreground">
                            Last successful refresh:
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(lastRefreshTime, { addSuffix: true })}
                        </p>
                    </>
                ) : (
                     <p className="text-sm text-muted-foreground flex items-center justify-center">
                        <FiInfo className="mr-1 h-4 w-4"/> No refresh history found.
                    </p>
                )}
            </div>

             {/* Dynamic content area */}
            <div className="w-full flex-grow flex flex-col justify-center items-center px-4 pb-6">
                 {renderContent()}
            </div>
        </div>

        {/* Passphrase Modal */}
        <PassphraseModal
          isOpen={isPassphraseModalOpen}
          onClose={handleClosePassphraseModal}
          onPassphraseSubmit={handlePassphraseSubmit}
          existingPassphrase={true} // Always prompt for existing passphrase in refresh flow
        />
    </div>
  );
}

export default RefreshSheetContent; 