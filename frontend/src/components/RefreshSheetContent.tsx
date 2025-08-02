import { useState, useCallback, useRef, useEffect } from 'react';
import { triggerFullRefresh, getOverallRefreshStatus } from '../services/apiService';
import { OperationStatusDetailType, RefreshJobStatus } from '../types';
import { FiRefreshCw, FiLoader, FiInfo } from 'react-icons/fi';
import { formatDistanceToNow } from '../utils/datetimeUtils';
import PassphraseModal from './PassphraseModal';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { forceRefreshTransactions, forceRefreshTransactionsForMonth } from '../store/slices/transactionsSlice';
import { forceRefreshAccounts } from '../store/slices/accountsSlice';
import AccountProgressItem from './AccountProgressItem';

interface RefreshSheetContentProps {
  onClose: () => void;
  lastRefreshTime: number | null;
  onRefreshSuccess: () => void;
}

type ComponentStatus = 'idle' | 'loading' | 'success' | 'error';

function RefreshSheetContent({ onClose, lastRefreshTime, onRefreshSuccess }: RefreshSheetContentProps) {

  const [componentStatus, setComponentStatus] = useState<ComponentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [displayProgress, setDisplayProgress] = useState<{ [accountNumber: string]: OperationStatusDetailType }>({});
  const [isMasterKeyModalOpen, setIsMasterKeyModalOpen] = useState<boolean>(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dispatch = useDispatch();
  const allAccounts = useSelector((state: RootState) => state.accounts.accounts);
  const accountsStatus = useSelector((state: RootState) => state.accounts.status);
  const accountsError = useSelector((state: RootState) => state.accounts.error);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      console.log("Overall status polling stopped.");
    }
    if (statusResetTimeoutRef.current) {
        clearTimeout(statusResetTimeoutRef.current);
        statusResetTimeoutRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    console.log("Starting overall status polling...");
    setComponentStatus('loading');
    setErrorMessage(null);

    const pollFn = async () => {
      try {
        const statusResponse = await getOverallRefreshStatus();
        setDisplayProgress(statusResponse.progressMap);

        if (!statusResponse.refreshInProgress) {
          console.log("API indicates refresh is no longer in progress. Processing final state.");
          stopPolling();

          const finalProgressMap = statusResponse.progressMap;
          const progressValues = Object.values(finalProgressMap);
          const isAnyError = progressValues.some((p: OperationStatusDetailType) =>
            p.status === RefreshJobStatus.ERROR ||
            p.status === RefreshJobStatus.LOGIN_FAILED ||
            p.status === RefreshJobStatus.PROCESSING_FAILED ||
            p.status === RefreshJobStatus.LOGOUT_FAILED
          );

          if (isAnyError) {
            console.log("Refresh finished with errors.");
            setComponentStatus('error');
            setErrorMessage('One or more accounts failed to refresh. See details below.');
          } else {
            console.log("Refresh finished successfully.");
            setComponentStatus('success');
            setErrorMessage(null);
            
            // Force refresh all data after successful refresh
            dispatch(forceRefreshAccounts() as any);
            dispatch(forceRefreshTransactions() as any);
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            dispatch(forceRefreshTransactionsForMonth({ year: currentYear, month: currentMonth }) as any);
            
            onRefreshSuccess();
          }
        } else {
          console.log("API indicates refresh is still in progress. Continuing poll.");
          if (componentStatus !== 'loading') {
              setComponentStatus('loading');
          }
        }
      } catch (error: any) {
        console.error("Error polling overall status:", error);
        setErrorMessage(`Failed to get refresh status: ${error.message}`);
        setComponentStatus('error');
        stopPolling();
      }
    };

    pollFn();
    pollIntervalRef.current = setInterval(pollFn, 5000);
  }, [stopPolling, dispatch, onRefreshSuccess, componentStatus]);

  useEffect(() => {
    let isMounted = true;
    const fetchInitialStatus = async () => {
        try {
            const initialStatusResponse = await getOverallRefreshStatus();
            if (!isMounted) return;
            setDisplayProgress(initialStatusResponse.progressMap);
            if (initialStatusResponse.refreshInProgress) {
                console.log("Initial status indicates refresh is IN progress. Starting polling.");
                startPolling();
            } else {
                 console.log("Initial status indicates refresh is NOT in progress. Displaying last result.");
                 setComponentStatus('idle');
                 stopPolling();
            }
        } catch (error: any) {
            if (!isMounted) return;
            console.error("Error fetching initial overall status:", error);
            setErrorMessage(`Failed to fetch initial status: ${error.message}`);
            setComponentStatus('idle');
            setDisplayProgress({});
            stopPolling();
        }
    };
    fetchInitialStatus();
    return () => {
        console.log('RefreshSheetContent UNMOUNTING...');
        isMounted = false;
        stopPolling();
    };
   }, [startPolling, stopPolling]);

  const handleRefreshRequest = useCallback(() => {
    setErrorMessage(null);
    setDisplayProgress({});

    if (accountsStatus === 'loading') {
        setErrorMessage('Accounts are still loading, please wait...');
        return;
    }
    if (accountsStatus === 'failed') {
        setErrorMessage(`Failed to load accounts: ${accountsError || 'Unknown error'}`);
        return;
    }
    if (!allAccounts || allAccounts.length === 0) {
        setErrorMessage('No accounts configured in the application. Add accounts to enable refresh.');
        return;
    }
    setIsMasterKeyModalOpen(true);
  }, [allAccounts, accountsStatus, accountsError]);

  const handleMasterKeySubmit = useCallback(async (masterKey: string) => {
    setIsMasterKeyModalOpen(false);
    setComponentStatus('loading');
    setErrorMessage(null);
    setDisplayProgress({});

    try {
      await triggerFullRefresh(masterKey);
      console.log("Full refresh triggered successfully.");
      startPolling();
    } catch (err: any) {
      console.error('Failed to trigger full refresh:', err);
      let apiErrorMessage = 'Full refresh request failed. Check backend logs or connection.';
      if (err instanceof Error && err.message) {
          apiErrorMessage = err.message;
      }
      setErrorMessage(apiErrorMessage);
      setComponentStatus('error');
      setDisplayProgress({});
    }
  }, [allAccounts, startPolling]);

  const handleCloseMasterKeyModal = useCallback(() => {
    setIsMasterKeyModalOpen(false);
  }, []);

  const displayProgressList: OperationStatusDetailType[] = Object.values(displayProgress);

  return (
    <div className="p-2 pt-8 flex flex-col overflow-y-auto">
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
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-md">
                <button
                    onClick={handleRefreshRequest}
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
                            Refresh All
                        </>
                    )}
                </button>
            </div>

             {errorMessage && (componentStatus === 'idle' || componentStatus === 'error') && (
                 <div className="bg-error/10 text-error border border-error/30 rounded-md p-3 text-sm w-full max-w-md text-center">
                     {errorMessage}
                 </div>
             )}

            <div className="flex flex-col w-full max-w-md space-y-4 py-4">
                {displayProgressList.length > 0 && (
                  <>
                        <ul className="w-full bg-card border border-border rounded-2xl divide-y divide-border">
                            {displayProgressList.map((p: OperationStatusDetailType) => <AccountProgressItem key={`${p.accountNumber}-display`} progress={p} />)}
                        </ul>
                  </>
                )}
            </div>
        </div>
        <PassphraseModal
          isOpen={isMasterKeyModalOpen}
          onClose={handleCloseMasterKeyModal}
          onPassphraseSubmit={handleMasterKeySubmit}
        />
    </div>
  );
}

export default RefreshSheetContent; 
