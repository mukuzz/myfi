import React, { useState } from 'react';
import { FiLoader, FiCheckCircle, FiXCircle, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { formatDistanceToNow } from '../utils/datetimeUtils';
import { ScrapingProgress, ScrapingStatus, ScrapingEvent } from '../types';

// Helper to get a user-friendly status text
const getFriendlyStatus = (status: ScrapingStatus | undefined): string => {
    if (!status) return 'Unknown';
    switch (status) {
        case ScrapingStatus.PENDING: return 'Queued';
        case ScrapingStatus.ACQUIRING_PERMIT: return 'Waiting for Bank';
        case ScrapingStatus.LOGIN_STARTED: return 'Logging In...';
        case ScrapingStatus.LOGIN_SUCCESS: return 'Logged In';
        case ScrapingStatus.LOGIN_FAILED: return 'Login Failed';
        case ScrapingStatus.SCRAPING_STARTED: return 'Fetching Data...';
        case ScrapingStatus.SCRAPING_BANK_STARTED: return 'Fetching Bank Data...';
        case ScrapingStatus.SCRAPING_CC_STARTED: return 'Fetching Card Data...';
        case ScrapingStatus.SCRAPING_SUCCESS: return 'Data Fetch Complete';
        case ScrapingStatus.SCRAPING_FAILED: return 'Data Fetch Failed';
        case ScrapingStatus.LOGOUT_STARTED: return 'Logging Out...';
        case ScrapingStatus.LOGOUT_SUCCESS: return 'Logged Out';
        case ScrapingStatus.LOGOUT_FAILED: return 'Logout Failed';
        case ScrapingStatus.COMPLETED: return 'Completed';
        case ScrapingStatus.ERROR: return 'Error';
        default: return status; // Fallback to the raw status
    }
};


// Helper component for displaying individual account progress
interface AccountProgressItemProps {
    progress: ScrapingProgress;
}

const AccountProgressItem: React.FC<AccountProgressItemProps> = ({ progress }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isError = progress.status === ScrapingStatus.ERROR ||
                    progress.status === ScrapingStatus.LOGIN_FAILED ||
                    progress.status === ScrapingStatus.SCRAPING_FAILED ||
                    progress.status === ScrapingStatus.LOGOUT_FAILED;
    const isSuccess = progress.status === ScrapingStatus.COMPLETED;
    const isLoading = !isError && !isSuccess;

    const latestEvent = progress.history && progress.history.length > 0
        ? progress.history[progress.history.length - 1]
        : null;

    const statusText = getFriendlyStatus(progress.status);
    // const message = progress.errorMessage || latestEvent?.message || statusText; // Message not used currently

    return (
        <li className="border-b border-border last:border-b-0 py-3 px-3">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center min-w-0"> {/* Added min-w-0 for better truncation */}
                    {isLoading && <FiLoader className="animate-spin h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />}
                    {isSuccess && <FiCheckCircle className="h-4 w-4 text-success mr-2 flex-shrink-0" />}
                    {isError && <FiXCircle className="h-4 w-4 text-error mr-2 flex-shrink-0" />}
                    <span className="font-medium text-sm truncate mr-2">{progress.accountName}</span>
                    <span className="text-xs text-muted-foreground truncate flex-shrink-0">({progress.accountNumber.slice(-4)})</span> {/* Added flex-shrink-0 */}
                </div>
                <div className="flex items-center ml-2 flex-shrink-0"> {/* Added ml-2 and flex-shrink-0 */}
                     <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${isError ? 'bg-error/10 text-error' : isSuccess ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {statusText}
                    </span>
                     {progress.history && progress.history.length > 0 && (
                         isExpanded
                            ? <FiChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
                            : <FiChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
                     )}
                 </div>
            </div>
            {isExpanded && progress.history && progress.history.length > 0 && (
                <div className="mt-2 pl-6 text-xs text-muted-foreground space-y-1">
                    {progress.errorMessage && progress.status !== ScrapingStatus.COMPLETED && (
                         <p className="text-error"><span className="font-semibold">Error:</span> {progress.errorMessage}</p>
                    )}
                    <p>Last Update: {progress.lastUpdateTime ? formatDistanceToNow(new Date(progress.lastUpdateTime).getTime(), { addSuffix: true }) : 'N/A'}</p>
                    <p>History:</p>
                     <ul className="list-disc pl-4 space-y-0.5">
                        {progress.history.slice().reverse().map((event: ScrapingEvent, index: number) => (
                            <li key={index}>
                                {getFriendlyStatus(event.status)} ({formatDistanceToNow(new Date(event.timestamp).getTime(), { addSuffix: true })})
                                {event.message && <span className="italic"> - {event.message}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </li>
    );
};

export default AccountProgressItem;
export { getFriendlyStatus }; // Exporting helper if needed elsewhere, otherwise remove 