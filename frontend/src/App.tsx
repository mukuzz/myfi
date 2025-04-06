import React, { useState } from 'react';
import { Tab } from './types'; // Import Tab type
import Home from './components/Home';
import Transactions from './components/Transactions';
import Accounts from './components/Accounts';
import BottomNav from './components/BottomNav';
import { useIsMobile } from './hooks/useIsMobile'; // Import the hook

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Transactions'); // Default to Transactions
  const isMobile = useIsMobile(); // Use the hook

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
    // Apply dark theme background to the whole app
    <div className="flex flex-col h-screen bg-background">
      {isMobile ? (
        <>
          {/* Mobile: Main Content Area */}
          <main className="flex-grow overflow-y-auto flex flex-col">
            {renderMobileContent()}
          </main>
          {/* Mobile: Bottom Tab Navigation */}
          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </>
      ) : (
        <>
          {/* Desktop: Side-by-side Content Area */}
          <main className="flex-grow overflow-y-auto flex flex-row space-x-4">
            <div className="flex-1 p-2 overflow-y-auto"><Home /></div>
            <div className="flex-1 overflow-y-auto max-w-[350px]"><Transactions /></div>
          </main>
          {/* No BottomNav on desktop */}
        </>
      )}
    </div>
  );
}

export default App;
