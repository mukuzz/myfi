import React, { useState, useCallback } from 'react';
import { fetchAccounts, triggerScraping } from '../services/apiService'; // Assuming triggerScraping will be added
import { Account, ScrapeRequest } from '../types'; // Assuming ScrapeRequest will be defined
import { FiRefreshCw, FiLoader, FiXCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { formatDistanceToNow } from '../utils/datetimeUtils';

// Key prefix for local storage (should match AddAccountSheet)
const NETBANKING_STORAGE_PREFIX = 'netbanking_';

interface RefreshSheetContentProps {
  onClose: () => void;
  lastRefreshTime: number | null; // Receive last refresh time
  onRefreshSuccess: () => void; // Callback for success
}

type RefreshStatus = 'idle' | 'loading' | 'success' | 'error';

function RefreshSheetContent({ onClose, lastRefreshTime, onRefreshSuccess }: RefreshSheetContentProps) {
  const [status, setStatus] = useState<RefreshStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);

    try {
      // 1. Fetch all accounts
      const accounts: Account[] = await fetchAccounts();
      if (!accounts || accounts.length === 0) {
        setStatus('idle'); // Or maybe an error/message state?
        setErrorMessage('No accounts found to refresh.');
        return;
      }

      // 2. Retrieve credentials from local storage
      const scrapeRequests: ScrapeRequest[] = [];
      accounts.forEach(account => {
        const storageKey = `${NETBANKING_STORAGE_PREFIX}${account.accountNumber}`;
        try {
          const storedCredentials = localStorage.getItem(storageKey);
          if (storedCredentials) {
            const { username, password } = JSON.parse(storedCredentials);
            if (username && password) {
              scrapeRequests.push({
                accountNumber: account.accountNumber,
                username,
                password,
                accountId: account.id, // Pass account ID for reference
                accountType: account.type,
                accountName: account.name, // Include the account name
              });
            } else {
               console.warn(`Incomplete credentials found in local storage for account ${account.accountNumber}`);
            }
          } else {
             console.log(`No netbanking credentials found in local storage for account ${account.accountNumber}`);
          }
        } catch (error) {
           console.error(`Error parsing credentials for account ${account.accountNumber}:`, error);
        }
      });

      if (scrapeRequests.length === 0) {
        setStatus('idle');
        setErrorMessage('No accounts with stored credentials found for refreshing.');
        return;
      }

      // 3. Call the scraping API
      console.log('Triggering scraping for:', scrapeRequests);
      await triggerScraping(scrapeRequests); // Call the (to be created) API function

      setStatus('success');
      onRefreshSuccess(); // Call the success callback

      // Optionally close the sheet after a short delay on success
      setTimeout(() => {
         // Reset state before closing
         setStatus('idle');
         setErrorMessage(null);
         onClose();
         // Reset status for next open? Or keep success message?
         // setStatus('idle'); 
      }, 1500); 

    } catch (err: any) {
      console.error('Failed to refresh transactions:', err);
      setErrorMessage(err.message || 'Failed to trigger transaction refresh. Please try again.');
      setStatus('error');
    }
  }, [onClose, onRefreshSuccess]);

  const renderButtonContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <FiLoader className="animate-spin mr-2 h-5 w-5" />
            Refreshing...
          </>
        );
      case 'success':
        return (
          <>
            <FiCheckCircle className="mr-2 h-5 w-5" />
            Refresh Started!
          </>
        );
      case 'error':
         return (
           <>
             <FiXCircle className="mr-2 h-5 w-5" />
             Refresh Failed
           </>
         );
      case 'idle':
      default:
        return (
          <>
            <FiRefreshCw className="mr-2 h-5 w-5" />
            Refresh Transactions
          </>
        );
    }
  };

  return (
    <div className="p-6 pt-8 flex-grow flex flex-col h-full justify-center items-center">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-semibold">Account Refresh</h2>
        {/* Optional: Add a close button if needed, though handle works */}
        {/* <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <FiX />
        </button> */}
      </div>

      <div className="flex-grow overflow-y-auto pb-6 pr-1 flex flex-col justify-center items-center">
        {/* Display Last Refresh Time */}
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
              <FiInfo className="mr-1 h-4 w-4"/> No refresh history found.
            </p>
          )}
        </div>

        {status === 'error' && errorMessage && (
          <div className="bg-error/10 text-error border border-error/30 rounded-md p-3 mb-4 text-sm w-full text-center">
            {errorMessage}
          </div>
        )}
         {status === 'success' && (
           <div className="bg-success/10 text-success border border-success/30 rounded-md p-3 mb-4 text-sm w-full text-center">
             Refresh process initiated successfully. Transactions will appear soon.
           </div>
         )}
         {status === 'idle' && errorMessage && ( // For messages like "no accounts found"
            <div className="bg-info/10 text-info border border-info/30 rounded-md p-3 mb-4 text-sm w-full text-center">
               {errorMessage}
            </div>
         )}


        <p className="text-sm text-muted-foreground mb-6 text-center px-4">
           Click the button below to securely fetch the latest transactions for accounts where you've saved credentials.
        </p>

        <button
          onClick={handleRefresh}
          disabled={status === 'loading' || status === 'success'} // Disable while loading or after success until closed/reset
          className={`w-full max-w-xs py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 
            ${status === 'loading' || status === 'success' ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}
            ${status === 'idle' ? 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary' : ''}
            ${status === 'error' ? 'bg-error text-error-foreground hover:bg-error/90 focus:ring-error' : ''}
            ${status === 'success' ? 'bg-success text-success-foreground hover:bg-success/90 focus:ring-success' : ''}
           `}
        >
          {renderButtonContent()}
        </button>
      </div>
    </div>
  );
}

export default RefreshSheetContent; 