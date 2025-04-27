import { useState, useCallback, useRef, useEffect } from 'react';
import { triggerScraping, getScrapingStatus } from '../services/apiService';
import { Account, ScrapeRequest, ScrapingProgress, ScrapingStatus } from '../types';
import { FiRefreshCw, FiLoader, FiXCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { formatDistanceToNow } from '../utils/datetimeUtils';
import { decryptCredentials, EncryptedCredentialData } from '../utils/cryptoUtils';
import PassphraseModal from './PassphraseModal';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { fetchTransactions, fetchTransactionsForMonth } from '../store/slices/transactionsSlice';
import AccountProgressItem from './AccountProgressItem';


const NETBANKING_STORAGE_PREFIX = 'myfi_credential_';

interface RefreshSheetContentProps {
  onClose: () => void;
  lastRefreshTime: number | null;
  onRefreshSuccess: () => void;
}

// Simplified status, mainly controlling the *current* refresh section
type ComponentStatus = 'idle' | 'loading' | 'success' | 'error';

function RefreshSheetContent({ onClose, lastRefreshTime, onRefreshSuccess }: RefreshSheetContentProps) {
  console.log('RefreshSheetContent rendering/mounting...');

  const [componentStatus, setComponentStatus] = useState<ComponentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // For general/decryption errors or API fetch errors
  const [displayProgress, setDisplayProgress] = useState<{ [accountNumber: string]: ScrapingProgress }>({}); // Unified progress display
  const [isPassphraseModalOpen, setIsPassphraseModalOpen] = useState<boolean>(false);
  const [accountsToRefresh, setAccountsToRefresh] = useState<Account[]>([]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusResetTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for the status reset timeout

  // Redux state and dispatch
  const dispatch = useDispatch();
  const allAccounts = useSelector((state: RootState) => state.accounts.accounts);
  const accountsStatus = useSelector((state: RootState) => state.accounts.status);
  const accountsError = useSelector((state: RootState) => state.accounts.error);

  // --- Polling Logic ---
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      console.log("Scraping status polling stopped.");
    }
    // Also clear any pending status reset timeout
    if (statusResetTimeoutRef.current) {
        clearTimeout(statusResetTimeoutRef.current);
        statusResetTimeoutRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling(); // Clear existing intervals and timeouts
    console.log("Starting scraping status polling...");
    setComponentStatus('loading'); // Ensure status is loading when polling starts
    setErrorMessage(null); // Clear previous errors when starting a new poll cycle

    const pollFn = async () => {
      try {
        // console.log("Polling for scraping status...");
        const statusResponse = await getScrapingStatus();
        // console.log("Received status response:", JSON.stringify(statusResponse, null, 2));

        // Update the *unified* progress state
        setDisplayProgress(statusResponse.progressMap);

        if (!statusResponse.refreshInProgress) {
          console.log("API indicates refresh is no longer in progress. Processing final state.");
          stopPolling(); // Stop interval immediately

          const finalProgressMap = statusResponse.progressMap;
          const progressValues = Object.values(finalProgressMap);
          const isAnyError = progressValues.some(p =>
            p.status === ScrapingStatus.ERROR ||
            p.status === ScrapingStatus.LOGIN_FAILED ||
            p.status === ScrapingStatus.SCRAPING_FAILED ||
            p.status === ScrapingStatus.LOGOUT_FAILED
          );

          // Set final component status (success/error)
          if (isAnyError) {
            console.log("Refresh finished with errors.");
            setComponentStatus('error');
            setErrorMessage('One or more accounts failed to refresh. See details below.');
          } else {
            console.log("Refresh finished successfully.");
            setComponentStatus('success');
            setErrorMessage(null); // Clear previous errors
            dispatch(fetchTransactions() as any);
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1; // 1-indexed month
            dispatch(fetchTransactionsForMonth({ year: currentYear, month: currentMonth }) as any);
            onRefreshSuccess(); // Notify parent of success
          }

        } else {
          // Still processing according to API
          console.log("API indicates refresh is still in progress. Continuing poll.");
          // Ensure component is in loading state if it somehow changed
          if (componentStatus !== 'loading') {
              setComponentStatus('loading');
          }
        }

      } catch (error: any) {
        console.error("Error polling scraping status:", error);
        setErrorMessage(`Failed to get refresh status: ${error.message}`);
        setComponentStatus('error'); // Show error in the 'current refresh' section
        // Don't update last attempt state here as the poll failed, not the scrape job
        stopPolling();
      }
    };

    pollFn(); // Run immediately
    pollIntervalRef.current = setInterval(pollFn, 5000); // Poll every 5 seconds

  }, [stopPolling, dispatch, onRefreshSuccess, componentStatus]);

  // --- Initial Status Fetch ---
  useEffect(() => {
    let isMounted = true;
    const fetchInitialStatus = async () => {
        console.log("Fetching initial scraping status on component mount...");

        try {
            const initialStatusResponse = await getScrapingStatus();
            if (!isMounted) return;

            // Always update displayProgress with the fetched map
            setDisplayProgress(initialStatusResponse.progressMap);

            // *** Check the refreshInProgress flag first ***
            if (initialStatusResponse.refreshInProgress) {
                console.log("Initial status indicates refresh is IN progress. Starting polling.");
                startPolling(); // This will set status to loading
            } else {
                 console.log("Initial status indicates refresh is NOT in progress. Displaying last result.");
                 // Refresh is not running, displayProgress is already set above
                 setComponentStatus('idle'); // Stay idle
                 stopPolling(); // Ensure polling is stopped
            }
        } catch (error: any) {
            if (!isMounted) return;
            console.error("Error fetching initial scraping status:", error);
            setErrorMessage(`Failed to fetch initial status: ${error.message}`);
            // Keep componentStatus idle, just show the error message
            setComponentStatus('idle');
            setDisplayProgress({}); // Clear progress on initial fetch error
            stopPolling();
        }
    };

    fetchInitialStatus();

    return () => {
        console.log('RefreshSheetContent UNMOUNTING...');
        isMounted = false;
        stopPolling(); // Clean up interval and timeout on unmount
    };
    // Dependencies: only run on mount essentially, but include utils used inside
   }, [startPolling, stopPolling]);

  // --- Credential Check & Passphrase ---
  const checkForRefreshableAccounts = useCallback(() => {
    // Reset only general error message, keep last attempt visible
    setErrorMessage(null);
    // Reset component status to idle in case it was error/success previously
    // Keep displayProgress showing the last result
    setComponentStatus('idle');

    // Handle Redux account loading states
    if (accountsStatus === 'loading') {
        setErrorMessage('Accounts are still loading, please wait...');
        return;
    }
    if (accountsStatus === 'failed') {
        setErrorMessage(`Failed to load accounts: ${accountsError || 'Unknown error'}`);
        return;
    }
    if (!allAccounts || allAccounts.length === 0) {
        setErrorMessage('No accounts configured in the application.');
        return;
    }

    try {
        const refreshableAccounts = allAccounts.filter((account: Account) => {
            const storageKey = `${NETBANKING_STORAGE_PREFIX}${account.id}`;
            return localStorage.getItem(storageKey) !== null;
        });

        if (refreshableAccounts.length === 0) {
            setErrorMessage('No accounts found with saved credentials to refresh.');
        } else {
            setAccountsToRefresh(refreshableAccounts);
            setIsPassphraseModalOpen(true);
        }
    } catch (err: any) {
        console.error('Error during credential check:', err);
        setErrorMessage('An unexpected error occurred while checking credentials.');
        setComponentStatus('error'); // Indicate an error in the process itself
        setDisplayProgress({}); // Clear progress on credential check error
    }
  }, [allAccounts, accountsStatus, accountsError]); // Depend on Redux state

  // --- Handle Passphrase Submit ---
  const handlePassphraseSubmit = useCallback(async (passphrase: string) => {
    setIsPassphraseModalOpen(false);
    setComponentStatus('loading'); // Set component status to loading for the *new* refresh
    setErrorMessage(null); // Clear previous errors

    const scrapeRequests: ScrapeRequest[] = [];
    let decryptionFailed = false;
    let decryptionErrorAccountName = '';

    // Initialize *display* progress map for expected accounts
    const initialProgress: { [accountNumber: string]: ScrapingProgress } = {};
    accountsToRefresh.forEach(acc => {
        initialProgress[acc.accountNumber] = {
            accountNumber: acc.accountNumber,
            accountName: acc.name,
            status: ScrapingStatus.PENDING,
            startTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
            errorMessage: null,
            history: [{ status: ScrapingStatus.PENDING, timestamp: new Date().toISOString(), message: 'Refresh initiated' }]
        };
    });
    setDisplayProgress(initialProgress); // Show pending state immediately in the unified display

    for (const account of accountsToRefresh) {
      const storageKey = `${NETBANKING_STORAGE_PREFIX}${account.id}`;
      const storedDataString = localStorage.getItem(storageKey);

      if (storedDataString) {
        try {
          const encryptedData: EncryptedCredentialData = JSON.parse(storedDataString);
          const { username, password } = await decryptCredentials(encryptedData, passphrase);
          scrapeRequests.push({
            accountId: account.id, accountType: account.type, accountName: account.name,
            username, password, accountNumber: account.accountNumber,
          });
        } catch (error: any) {
          console.error(`Decryption failed for account ${account.name} (${account.id}):`, error);
          let decrError = 'Decryption failed. Check passphrase or data.';
          if (error instanceof Error && error.message.includes('bad decrypt')) {
              decrError = 'Invalid passphrase or corrupted data.';
          } else if (error instanceof Error) {
              decrError = error.message;
          }
          decryptionErrorAccountName = account.name;
          setErrorMessage(`Account ${decryptionErrorAccountName}: ${decrError}`);
          setComponentStatus('error'); // Show error in the 'current refresh' section
          decryptionFailed = true;
          setDisplayProgress({}); // Clear the pending progress display on decryption failure
          break;
        }
      }
    }

    // If decryption failed, stop here, show error message, keep componentStatus as 'error'
    if (decryptionFailed) {
        setAccountsToRefresh([]);
        setDisplayProgress({}); // Clear the pending progress display
        // Don't stop polling, as it wasn't started
        return;
    }

    // If no requests could be prepared (e.g., data missing after filtering)
    if (scrapeRequests.length === 0 && !decryptionFailed) {
      setComponentStatus('idle'); // Go back to idle
      setErrorMessage('No credentials could be decrypted or prepared for refresh.');
      setAccountsToRefresh([]);
      setDisplayProgress({}); // Clear progress if no requests were made
      return;
    }

    // If requests are ready, trigger the scrape
    try {
      console.log('Triggering scraping for:', scrapeRequests.map(r => ({ ...r, password: '***' })));
      await triggerScraping(scrapeRequests);
      // Successfully triggered, start polling. Polling function will handle status updates.
      startPolling();
    } catch (err: any) {
      console.error('Failed to trigger scraping:', err);
      let apiErrorMessage = 'Scraping request failed. Check backend logs or connection.';
      if (err.message) {
          apiErrorMessage = err.message;
      }
      setErrorMessage(apiErrorMessage);
      setComponentStatus('error'); // Show error in the 'current refresh' section
      setAccountsToRefresh([]);
      setDisplayProgress({}); // Clear pending progress on trigger failure
      // Don't need to stop polling as it wasn't started on trigger failure
    }
  }, [startPolling, accountsToRefresh]); // Removed stopPolling, dispatch, updateLastAttemptState from deps


  const handleClosePassphraseModal = useCallback(() => {
    setIsPassphraseModalOpen(false);
    // setComponentStatus('idle'); // No, keep the status (likely idle or showing last result)
    // stopPolling(); // No need to stop polling if it wasn't started
    setAccountsToRefresh([]); // Clear the accounts list state
  }, []);


 // Derive progress list for rendering the unified section
 const displayProgressList: ScrapingProgress[] = Object.values(displayProgress);


 return (
    <div className="p-2 pt-8 flex flex-col overflow-y-auto">

        {/* 1. Header Section (Last Refresh Time) */}
        <div className="mb-6 text-center">
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
                    <FiInfo className="mr-1 h-4 w-4"/> No successful refresh history found.
                </p>
            )}
        </div>

        <div className="w-full flex flex-col justify-start items-center px-4 pb-6 space-y-6">

            {/* Show Refresh button when idle or on error */}
            {(componentStatus === 'idle' || componentStatus === 'error') && (
                 <button
                    onClick={checkForRefreshableAccounts}
                    // Disable when accounts are loading
                    disabled={accountsStatus === 'loading'}
                    className={`py-3 px-6 rounded-lg font-semibold flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    <FiRefreshCw className="h-5 w-5 mr-2" />Refresh
                </button>
            )}

             {/* 2. General Error Display Area (outside main progress flow) */}
             {/* Show general errors mainly when idle, or specific API/decryption errors when error */}
             {errorMessage && (componentStatus === 'idle' || componentStatus === 'error') && (
                 <div className="bg-error/10 text-error border border-error/30 rounded-md p-3 text-sm w-full max-w-md text-center">
                     {errorMessage}
                 </div>
             )}


            {/* 3. Unified Progress/Status Area */}
            <div className="flex flex-col w-full max-w-md space-y-4 py-4">
                {/* Conditional Title/Status Message */}
                {componentStatus === 'loading' && (
                    <div className="flex items-center justify-center">
                        <FiLoader className="animate-spin h-5 w-5 text-primary mr-3" />
                        <p className="text-lg font-semibold text-foreground">Refreshing Accounts...</p>
                    </div>
                )}
                 {componentStatus === 'idle' && displayProgressList.length > 0 && (
                     <div className="text-center">
                         <p className="font-medium text-muted-foreground">Last Refresh Status</p>
                     </div>
                 )}


                {/* Progress Details List (Rendered based on componentStatus and if data exists) */}
                {displayProgressList.length > 0 && (
                        <ul className="w-full bg-card border border-border rounded-2xl divide-y divide-border">
                            {displayProgressList.map(p => <AccountProgressItem key={`${p.accountNumber}-display`} progress={p} />)}
                        </ul>
                )}

                {/* Loading state placeholder if no progress yet */}
                {componentStatus === 'loading' && displayProgressList.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center">Waiting for progress updates...</p>
                )}

                 {/* Removed dedicated Try Again button */}
            </div>

        </div> {/* End Scrollable Content Area */}


        {/* Passphrase Modal (Remains unchanged) */}
        <PassphraseModal
          isOpen={isPassphraseModalOpen}
          onClose={handleClosePassphraseModal}
          onPassphraseSubmit={handlePassphraseSubmit}
          existingPassphrase={true}
        />
    </div>
  );
}

export default RefreshSheetContent; 
