import React, { useState } from 'react';
import { FiLoader, FiCheckCircle, FiXCircle, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { formatDistanceToNow } from '../utils/datetimeUtils';
import { OperationStatusDetailType, RefreshJobStatus, ProgressHistoryEntryType } from '../types';

// Helper to get a user-friendly status text, now using RefreshJobStatus
const getFriendlyStatus = (status: RefreshJobStatus | undefined): string => {
    if (!status) return 'Unknown';
    switch (status) {
        case RefreshJobStatus.PENDING: return 'Queued';
        case RefreshJobStatus.INITIALIZING: return 'Initializing';
        case RefreshJobStatus.ACQUIRING_PERMIT: return 'Waiting for Bank';
        case RefreshJobStatus.LOGIN_STARTED: return 'Logging In...';
        case RefreshJobStatus.LOGIN_SUCCESS: return 'Logged In';
        case RefreshJobStatus.LOGIN_FAILED: return 'Login Failed';
        case RefreshJobStatus.PROCESSING_STARTED: return 'Processing...';
        case RefreshJobStatus.BANK_PROCESSING_STARTED: return 'Fetching Bank Data...';
        case RefreshJobStatus.CC_PROCESSING_STARTED: return 'Fetching Card Data...';
        case RefreshJobStatus.PROCESSING_IN_PROGRESS: return 'Processing Data...';
        case RefreshJobStatus.PROCESSING_SUCCESS: return 'Data Processed';
        case RefreshJobStatus.PROCESSING_FAILED: return 'Processing Failed';
        case RefreshJobStatus.LOGOUT_STARTED: return 'Logging Out...';
        case RefreshJobStatus.LOGOUT_SUCCESS: return 'Logged Out';
        case RefreshJobStatus.LOGOUT_FAILED: return 'Logout Failed';
        case RefreshJobStatus.COMPLETED: return 'Completed';
        case RefreshJobStatus.ERROR: return 'Error';
        default:
            // Fallback for any new statuses not yet in the list
            const MappedStatus = status as string;
            return MappedStatus.charAt(0).toUpperCase() + MappedStatus.slice(1).toLowerCase().replace(/_/g, ' ');
    }
};


// Helper component for displaying individual account progress
interface AccountProgressItemProps {
    progress: OperationStatusDetailType; // Updated prop type
}

const AccountProgressItem: React.FC<AccountProgressItemProps> = ({ progress }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Updated conditions based on RefreshJobStatus
    const isError = progress.status === RefreshJobStatus.ERROR ||
                    progress.status === RefreshJobStatus.LOGIN_FAILED ||
                    progress.status === RefreshJobStatus.PROCESSING_FAILED ||
                    progress.status === RefreshJobStatus.LOGOUT_FAILED;
    const isSuccess = progress.status === RefreshJobStatus.COMPLETED;
    // isLoading can be any state that is not terminal (error or success)
    const isLoading = !isError && !isSuccess;

    // No change needed for latestEvent logic, as history structure is similar
    const latestEvent = progress.history && progress.history.length > 0
        ? progress.history[progress.history.length - 1]
        : null;

    const statusText = getFriendlyStatus(progress.status);

    return (
        <li className="py-3 px-3">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center min-w-0">
                    {isLoading && <FiLoader className="animate-spin h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />}
                    {isSuccess && <FiCheckCircle className="h-4 w-4 text-success mr-2 flex-shrink-0" />}
                    {isError && <FiXCircle className="h-4 w-4 text-error mr-2 flex-shrink-0" />}
                    <span className="font-medium text-sm truncate mr-2">{progress.accountName}</span>
                    <span className="text-xs text-muted-foreground truncate flex-shrink-0">({progress.accountNumber.slice(-4)})</span>
                </div>
                <div className="flex items-center ml-2 flex-shrink-0">
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
                    {/* progress.errorMessage is now a direct field from OperationStatusDetailType */}
                    {progress.errorMessage && progress.status !== RefreshJobStatus.COMPLETED && (
                         <p className="text-error"><span className="font-semibold">Error:</span> {progress.errorMessage}</p>
                    )}
                    <p>Last Update: {progress.lastUpdateTime ? formatDistanceToNow(new Date(progress.lastUpdateTime).getTime(), { addSuffix: true }) : 'N/A'}</p>
                    {/* Optional: Display itemsProcessed/itemsTotal if relevant for this view */}
                    {/* {typeof progress.itemsProcessed === 'number' && typeof progress.itemsTotal === 'number' && progress.itemsTotal > 0 && (
                        <p>Progress: {progress.itemsProcessed} / {progress.itemsTotal}</p>
                    )} */}
                    <p>History:</p>
                     <ul className="list-disc pl-4 space-y-0.5">
                        {/* History items now use ProgressHistoryEntryType */}
                        {progress.history.slice().reverse().map((event: ProgressHistoryEntryType, index: number) => (
                            <li key={index}>
                                {getFriendlyStatus(event.status)} ({formatDistanceToNow(new Date(event.timestamp).getTime(), { addSuffix: true })})<br/>
                                {event.message && <span className="italic">{event.message}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </li>
    );
};

export default AccountProgressItem;
export { getFriendlyStatus }; 