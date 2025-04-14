import React, { useState, useCallback, useRef } from 'react';
import { triggerScraping } from '../services/apiService';
import { Account, ScrapeRequest } from '../types';
import { FiRefreshCw, FiLoader, FiXCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { formatDistanceToNow } from '../utils/datetimeUtils';
// Import the crypto utility and the data interface
import { decryptCredentials, EncryptedCredentialData } from '../utils/cryptoUtils';
// Import PassphraseModal
import PassphraseModal from './PassphraseModal';
// Redux imports
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store'; // Corrected import path
import { fetchTransactions, fetchCurrentMonthTransactions } from '../store/slices/transactionsSlice';

// Key prefix for local storage (use a consistent prefix)
const NETBANKING_STORAGE_PREFIX = 'myfi_credential_'; // Changed prefix slightly for clarity

interface RefreshSheetContentProps {
  onClose: () => void;
  lastRefreshTime: number | null;
  onRefreshSuccess: () => void; // Keep for now, primarily signals completion to parent
}

type RefreshStatus = 'idle' | 'prompting' | 'loading' | 'success' | 'error';

function RefreshSheetContent({ onClose, lastRefreshTime, onRefreshSuccess }: RefreshSheetContentProps) {
  const [status, setStatus] = useState<RefreshStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPassphraseModalOpen, setIsPassphraseModalOpen] = useState<boolean>(false);
  // Ref to store accounts that need credentials for decryption later
  const accountsToRefreshRef = useRef<Account[]>([]);

  // Redux state and dispatch
  const dispatch = useDispatch();
  const allAccounts = useSelector((state: RootState) => state.accounts.accounts);
  const accountsStatus = useSelector((state: RootState) => state.accounts.status);
  const accountsError = useSelector((state: RootState) => state.accounts.error);

  // Function to check which accounts have stored credentials
  const checkForRefreshableAccounts = useCallback(() => {
    // Use accounts from Redux state directly
    // Reset status for this specific check
    setStatus('loading'); // Start loading for this specific action
    setErrorMessage(null);
    accountsToRefreshRef.current = []; // Clear previous list

    // Handle cases where accounts haven't loaded yet in Redux
    if (accountsStatus === 'loading') {
        setErrorMessage('Accounts are still loading, please wait...');
        setStatus('idle'); // Go back to idle, button should ideally be disabled by parent
        return;
    }
    if (accountsStatus === 'failed') {
        setErrorMessage(`Failed to load accounts: ${accountsError || 'Unknown error'}`);
        setStatus('idle');
        return;
    }
    if (!allAccounts || allAccounts.length === 0) {
        setErrorMessage('No accounts configured in the application.');
        setStatus('idle');
        return;
    }

    try {
        // Filter accounts directly from Redux state
        const refreshableAccounts = allAccounts.filter((account: Account) => {
            const storageKey = `${NETBANKING_STORAGE_PREFIX}${account.id}`; // Use account ID as key
            return localStorage.getItem(storageKey) !== null;
        });

        if (refreshableAccounts.length === 0) {
            setErrorMessage('No accounts found with saved credentials to refresh.');
            setStatus('idle'); // Stay idle if no accounts found
        } else {
            accountsToRefreshRef.current = refreshableAccounts;
            // Show passphrase modal instead of changing status to 'prompting'
            setIsPassphraseModalOpen(true);
             // Reset component status, modal handles next steps
             setStatus('idle');
        }
    } catch (err: any) {
        // This catch block might be less likely now, but keep for safety
        console.error('Error during credential check:', err);
        setErrorMessage('An unexpected error occurred while checking credentials.');
        setStatus('error');
    }
  }, [allAccounts, accountsStatus, accountsError]); // Depend on Redux state

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
          // More specific error from crypto util
          let decrError = 'Decryption failed. Check passphrase or data.';
          if (error instanceof Error && error.message.includes('bad decrypt')) {
              decrError = 'Invalid passphrase or corrupted data.';
          } else if (error instanceof Error) {
              decrError = error.message;
          }
          setErrorMessage(`Account ${account.name}: ${decrError}`);
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

      // Dispatch actions to refresh transactions in Redux store
      // We cast to `any` because the Thunk type expects arguments, but we want default behavior
      dispatch(fetchTransactions() as any);
      dispatch(fetchCurrentMonthTransactions() as any);

      onRefreshSuccess(); // Signal success to parent (e.g., for updating last refresh time)

      setTimeout(() => {
        // Don't reset status here, let the success message show until close
        setErrorMessage(null);
        accountsToRefreshRef.current = []; // Clear accounts list
        onClose(); // Close the sheet
      }, 2000); // Keep showing success message for 2 seconds

    } catch (err: any) {
      console.error('Failed to trigger scraping:', err);
      // If the API returns specific errors (e.g., bad credentials during scrape), display them.
      let apiErrorMessage = 'Scraping request failed. Check backend logs or connection.';
      if (err.response && err.response.data && err.response.data.message) {
          apiErrorMessage = err.response.data.message;
      } else if (err.message) {
          apiErrorMessage = err.message;
      }
      setErrorMessage(apiErrorMessage);
      setStatus('error');
      accountsToRefreshRef.current = []; // Clear accounts list
    }
  }, [dispatch, onClose, onRefreshSuccess]); // Added dispatch to dependencies

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