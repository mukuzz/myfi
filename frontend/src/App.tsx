import React, { useState, useEffect, useCallback } from 'react';
import { Tab } from './types'; // Import Tab type
import Home from './components/Home';
import Transactions from './components/Transactions';
import Accounts from './components/Accounts';
import BottomNav from './components/BottomNav';
import DraggableBottomSheet from './components/DraggableBottomSheet'; // Import the sheet
import RefreshSheetContent from './components/RefreshSheetContent'; // Import sheet content
import { getLastScrapeTime } from './services/apiService'; // Import the new API function
import { useIsMobile } from './hooks/useIsMobile'; // Import the hook
import { FiRefreshCw } from 'react-icons/fi'; // Import an icon

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Transactions'); // Default to Transactions
  const [isRefreshSheetOpen, setIsRefreshSheetOpen] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string | null>(null);
  const [isLoadingTime, setIsLoadingTime] = useState<boolean>(true);
  const isMobile = useIsMobile();

  const fetchLastRefresh = useCallback(async () => {
    setIsLoadingTime(true);
    const time = await getLastScrapeTime();
    setLastRefreshTime(time);
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
    // Optionally, you might want to pass this down further to trigger data reloads
  };

  const renderMobileContent = () => {
    switch (activeTab) {
      case 'Home':
        return <Home />;
      case 'Transactions':
        return <Transactions />;
      case 'Accounts':
        return <Accounts />;
      default:
        return <Home />; // Default to Home or handle appropriately
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {isMobile ? (
        <>
          {/* Mobile: Main Content Area */}
          <main className="flex-grow overflow-y-auto flex flex-col">
            {renderMobileContent()}
          </main>
          {/* Mobile: Refresh Bar */}
          <div 
            className="flex-shrink-0 px-4 py-2 bg-muted/50 border-t border-border flex items-center justify-center cursor-pointer hover:bg-muted/80"
            onClick={openRefreshSheet}
          >
            <FiRefreshCw className="mr-2 h-4 w-4" />
            <span className="text-sm font-medium">
              {isLoadingTime ? (
                'Loading refresh status...'
              ) : lastRefreshTime ? (
                `Last refresh: ${formatDistanceToNow(new Date(lastRefreshTime), { addSuffix: true })}`
              ) : (
                'Refresh Accounts'
              )}
            </span>
          </div>
          {/* Mobile: Bottom Tab Navigation */}
          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </>
      ) : (
        <>
          {/* Desktop: Side-by-side Content Area */}
          <main className="flex-grow overflow-y-auto flex flex-row space-x-4">
            <div className="flex-1 p-2 overflow-y-auto"><Home /></div>
            <div className="flex-1 overflow-y-auto max-w-[400px]"><Transactions /></div>
          </main>
          {/* No BottomNav on desktop */}
        </>
      )}
      {/* Refresh Bottom Sheet */}
      <DraggableBottomSheet isOpen={isRefreshSheetOpen} onClose={closeRefreshSheet}>
         <RefreshSheetContent 
            onClose={closeRefreshSheet} 
            lastRefreshTime={lastRefreshTime} // Pass the time down
            onRefreshSuccess={handleRefreshSuccess} // Pass the callback down
          />
      </DraggableBottomSheet>
    </div>
  );
}

export default App;
