import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { formatDistanceToNow } from '../utils/datetimeUtils';
import { getLastScrapeTime } from '../services/apiService'; // Import API service
import DraggableBottomSheet from './DraggableBottomSheet'; // Import the sheet
import RefreshSheetContent from './RefreshSheetContent'; // Import sheet content

interface RefreshBarProps {
  className?: string;
  style?: React.CSSProperties; // Add style prop
}

const RefreshBar: React.FC<RefreshBarProps> = ({ className, style }) => {
  const [isRefreshSheetOpen, setIsRefreshSheetOpen] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const [isLoadingTime, setIsLoadingTime] = useState<boolean>(true);

  const fetchLastRefresh = useCallback(async () => {
    setIsLoadingTime(true);
    try {
        const time = await getLastScrapeTime();
        setLastRefreshTime(time);
    } catch (error) {
        console.error("Failed to fetch last scrape time:", error);
        setLastRefreshTime(null); // Handle error state if needed
    }
    setIsLoadingTime(false);
  }, []);

  useEffect(() => {
    fetchLastRefresh(); // Fetch initially on mount
  }, [fetchLastRefresh]);

  const openRefreshSheet = () => setIsRefreshSheetOpen(true);
  const closeRefreshSheet = () => setIsRefreshSheetOpen(false);

  // Function to be called from RefreshSheetContent on success
  const handleRefreshSuccess = () => {
    fetchLastRefresh(); // Re-fetch the time
    // We can keep the sheet open or close it, closing seems more intuitive
    // closeRefreshSheet(); 
  };

  return (
    <>
      {/* The clickable bar */}
      <div 
        className={`z-10 flex-shrink-0 px-4 py-2 bg-muted border-t border-border flex items-center justify-center cursor-pointer ${className}`}
        onClick={openRefreshSheet}
        style={style} // Apply the style prop
      >
        <FiRefreshCw className="mr-2 h-4 w-4" />
        <span className="text-xs font-normal">
          {isLoadingTime ? (
            'Loading refresh status...'
          ) : lastRefreshTime ? (
            `Last refresh: ${formatDistanceToNow(lastRefreshTime, { addSuffix: false })}`
          ) : (
            'Refresh Accounts'
          )}
        </span>
      </div>

      {/* Refresh Bottom Sheet - Now rendered within RefreshBar */}
      <DraggableBottomSheet isOpen={isRefreshSheetOpen} onClose={closeRefreshSheet} title="Refresh Accounts">
         <RefreshSheetContent 
            onClose={closeRefreshSheet} 
            lastRefreshTime={lastRefreshTime} // Pass the time down (still needed by content)
            onRefreshSuccess={handleRefreshSuccess} // Pass the callback down
          />
      </DraggableBottomSheet>
    </>
  );
};

export default RefreshBar; 