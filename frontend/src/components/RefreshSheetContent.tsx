import { useState, useCallback, useRef, useEffect } from 'react';
import { triggerScraping, getOverallRefreshStatus, triggerGmailSync } from '../services/apiService';
import { Account, ScrapeRequest, OperationStatusDetailType, RefreshJobStatus, AggregatedRefreshStatusResponseType } from '../types';
import { FiRefreshCw, FiLoader, FiInfo, FiMail, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
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

// Add new Gmail sync status type
type GmailSyncStatus = 'idle' | 'loading' | 'success' | 'error';

function RefreshSheetContent({ onClose, lastRefreshTime, onRefreshSuccess }: RefreshSheetContentProps) {
  console.log('RefreshSheetContent rendering/mounting...');

  const [componentStatus, setComponentStatus] = useState<ComponentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // For general/decryption errors or API fetch errors
  const [displayProgress, setDisplayProgress] = useState<{ [accountNumber: string]: OperationStatusDetailType }>({}); // Unified progress display
  const [isPassphraseModalOpen, setIsPassphraseModalOpen] = useState<boolean>(false);
  const [accountsToRefresh, setAccountsToRefresh] = useState<Account[]>([]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusResetTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for the status reset timeout
  const [gmailSyncStatus, setGmailSyncStatus] = useState<GmailSyncStatus>('idle');

  // Redux state and dispatch
  const dispatch = useDispatch();
  const allAccounts = useSelector((state: RootState) => state.accounts.accounts);
  const accountsStatus = useSelector((state: RootState) => state.accounts.status);
  const accountsError = useSelector((state: RootState) => state.accounts.error);

  // --- Handle Gmail Sync Trigger ---
  const handleGmailSync = useCallback(async (): Promise<boolean> => {
    console.log("Triggering Gmail sync...");
    setGmailSyncStatus('loading');

    try {
      const result = await triggerGmailSync(); // Assume this is the actual API call
      console.log("Gmail sync API response:", result); // For debugging
      setGmailSyncStatus('success');
      return true;
    } catch (error: any) {
      console.error("Error triggering Gmail sync:", error);
      setGmailSyncStatus('error');
      // Attempt to get message from error object, default otherwise
      let errMsg = "An unknown error occurred during Gmail sync.";
      if (error && typeof error === 'object' && error.message) {
          errMsg = error.message; // Use the message from the error thrown by apiService
      } else if (typeof error === 'string') {
          errMsg = error;
      }
      return false;
    }
  }, [dispatch]); // Added dispatch as a common dependency, though not directly used in this version yet

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
        const statusResponse = await getOverallRefreshStatus();
        // console.log("Received status response:", JSON.stringify(statusResponse, null, 2));

        // Update the *unified* progress state
        setDisplayProgress(statusResponse.progressMap);

        if (!statusResponse.refreshInProgress) {
          console.log("API indicates refresh is no longer in progress. Processing final state.");
          stopPolling(); // Stop interval immediately

          const finalProgressMap = statusResponse.progressMap;
          const progressValues = Object.values(finalProgressMap);
          const isAnyError = progressValues.some((p: OperationStatusDetailType) =>
            p.status === RefreshJobStatus.ERROR ||
            p.status === RefreshJobStatus.LOGIN_FAILED ||
            p.status === RefreshJobStatus.PROCESSING_FAILED ||
            p.status === RefreshJobStatus.LOGOUT_FAILED
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

  // UPDATED: Function to trigger scraping and start polling (used by passphrase path)
  const triggerScrapingAndPoll = useCallback(async (scrapeRequests: ScrapeRequest[]) => {
    try {
      await triggerScraping(scrapeRequests);
      // Successfully triggered scraping, now trigger Gmail sync (if applicable)
      handleGmailSync();
      // Start polling for scraping status. Polling function will handle status updates.
      startPolling();
    } catch (err: any) {
      console.error('Failed to trigger scraping:', err);
      let apiErrorMessage = 'Scraping request failed. Check backend logs or connection.';
      if (err instanceof Error && err.message) {
          apiErrorMessage = err.message;
      }
      setErrorMessage(apiErrorMessage);
      setComponentStatus('error');
      setDisplayProgress({}); // Clear pending progress on trigger failure
    }
  }, [startPolling, handleGmailSync]);

  // --- Initial Status Fetch ---
  useEffect(() => {
    let isMounted = true;
    const fetchInitialStatus = async () => {
        console.log("Fetching initial scraping status on component mount...");

        try {
            const initialStatusResponse = await getOverallRefreshStatus();
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
    setErrorMessage(null);
    // componentStatus will be set to 'loading' by operations starting from here, or remains 'idle' if nothing to do.

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
        const savingsAccounts = allAccounts.filter((account: Account) => {
            const storageKey = `${NETBANKING_STORAGE_PREFIX}${account.id}`;
            return localStorage.getItem(storageKey) !== null;
        });

        const creditCardAccounts = allAccounts.filter((account: Account) => account.type === "CREDIT_CARD");

        if (savingsAccounts.length > 0) {
            // Savings accounts exist, passphrase needed. Combine with credit cards.
            const uniqueCreditCardAccounts = creditCardAccounts.filter(
                cc => !savingsAccounts.some(sa => sa.id === cc.id)
            );
            const refreshableAccounts = [...savingsAccounts, ...uniqueCreditCardAccounts];

            if (refreshableAccounts.length === 0) { 
                setErrorMessage('No accounts found with saved credentials to refresh.');
            } else {
                setAccountsToRefresh(refreshableAccounts);
                setIsPassphraseModalOpen(true); // This will lead to handlePassphraseSubmit which sets loading status
            }
        } else if (creditCardAccounts.length > 0) {
            // No savings accounts, but credit card accounts exist. Start Gmail sync only and show status.
            console.log("No savings accounts, but CCs. Initiating Gmail sync and updating component status.");
            setComponentStatus('loading'); // Set main component to loading
            setErrorMessage(null);         // Clear previous general errors
            setDisplayProgress({});       // Clear any account-specific progress display
            setAccountsToRefresh([]);     // No accounts are being actively scraped via this path
            
            handleGmailSync().then((gmailWasSuccessful) => {
                if (gmailWasSuccessful) {
                    // Perform actions similar to onRefreshSuccess
                    dispatch(fetchTransactions() as any);
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    const currentMonth = now.getMonth() + 1; // 1-indexed month
                    dispatch(fetchTransactionsForMonth({ year: currentYear, month: currentMonth }) as any);
                    onRefreshSuccess(); // Notify parent of success (e.g., update last refresh time)
                }
            });
        } else {
            // No savings accounts and no credit card accounts.
            setErrorMessage('No accounts available for refresh (neither with saved credentials nor credit cards).');
        }
    } catch (err: any) {
        console.error('Error during credential check:', err);
        setErrorMessage('An unexpected error occurred while checking credentials.');
        setComponentStatus('error');
        setDisplayProgress({});
    }
  }, [allAccounts, accountsStatus, accountsError, handleGmailSync, dispatch, onRefreshSuccess]);

  // --- Handle Passphrase Submit ---
  const handlePassphraseSubmit = useCallback(async (passphrase: string) => {
    setIsPassphraseModalOpen(false);
    setComponentStatus('loading');
    setErrorMessage(null);

    const scrapeRequests: ScrapeRequest[] = [];
    let decryptionFailed = false;
    let decryptionErrorAccountName = '';

    const initialProgress: { [accountNumber: string]: OperationStatusDetailType } = {};
    accountsToRefresh.forEach(acc => {
        initialProgress[acc.accountNumber] = {
            accountNumber: acc.accountNumber,
            accountName: acc.name,
            status: RefreshJobStatus.PENDING,
            startTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
            errorMessage: null,
            history: [{ status: RefreshJobStatus.PENDING, timestamp: new Date().toISOString(), message: 'Refresh initiated' }]
        };
    });
    setDisplayProgress(initialProgress);

    for (const account of accountsToRefresh) {
      // Only attempt decryption for accounts that are expected to have stored credentials (e.g., savings)
      // Credit card accounts included in accountsToRefresh here might not have stored creds,
      // but the triggerScraping API should handle them based on type.
      if (account.type === "CREDIT_CARD") {
        continue;
      }

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
          setComponentStatus('error');
          decryptionFailed = true;
          setDisplayProgress({});
          break;
        }
      }
    }

    if (decryptionFailed) {
        setAccountsToRefresh([]);
        setDisplayProgress({});
        return;
    }

    if (scrapeRequests.length === 0) {
      setErrorMessage('No credentials could be decrypted or no accounts prepared for refresh.');
      setAccountsToRefresh([]);
      setDisplayProgress({});
      return;
    }

    await triggerScrapingAndPoll(scrapeRequests);
  }, [accountsToRefresh, triggerScrapingAndPoll]);


  const handleClosePassphraseModal = useCallback(() => {
    setIsPassphraseModalOpen(false);
    // stopPolling(); // No need to stop polling if it wasn't started
    setAccountsToRefresh([]); // Clear the accounts list state
  }, []);

  // Derive progress list for rendering the unified section
  const displayProgressList: OperationStatusDetailType[] = Object.values(displayProgress);

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

            {/* Group Buttons Together */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-md">
                {/* Unified Refresh Button - Modified to always show and change text/icon/disabled state */}
                <button
                    onClick={checkForRefreshableAccounts}
                    disabled={accountsStatus === 'loading' || componentStatus === 'loading'}
                    className={`py-3 px-6 rounded-lg font-semibold flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed w-48`}
                >
                    {componentStatus === 'loading' ? (
                        <>
                            <FiLoader className="animate-spin h-5 w-5 mr-2" />
                            Refreshing...
                        </>
                    ) : (
                        <>
                            <FiRefreshCw className="h-5 w-5 mr-2" />
                            Refresh
                        </>
                    )}
                </button>
            </div>

             {/* 2. General Error Display Area (outside main progress flow) */}
             {/* Show general errors mainly when idle, or specific API/decryption errors when error */}
             {errorMessage && (componentStatus === 'idle' || componentStatus === 'error') && (
                 <div className="bg-error/10 text-error border border-error/30 rounded-md p-3 text-sm w-full max-w-md text-center">
                     {errorMessage}
                 </div>
             )}

            {/* 3. Unified Progress/Status Area */}
            <div className="flex flex-col w-full max-w-md space-y-4 py-4">

                {/* Progress Details List (Rendered based on componentStatus and if data exists) */}
                {displayProgressList.length > 0 && (
                  <>
                        <ul className="w-full bg-card border border-border rounded-2xl divide-y divide-border">
                            {displayProgressList.map((p: OperationStatusDetailType) => <AccountProgressItem key={`${p.accountNumber}-display`} progress={p} />)}
                        </ul>
                  </>
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
