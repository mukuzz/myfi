import { useState } from 'react';
import { Tab } from './types'; // Import Tab type
import Home from './components/Home';
import Transactions from './components/Transactions';
import BottomNav from './components/BottomNav';
import { useIsMobile } from './hooks/useIsMobile'; // Import the hook
import RefreshBar from './components/RefreshBar'; // Import the unified component

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Home'); // Default to Transactions
  const isMobile = useIsMobile();

  const renderMobileContent = () => {
    switch (activeTab) {
      case 'Home':
        return <Home />;
      case 'Transactions':
        return <Transactions />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background fixed bottom-0 w-full">
      {isMobile ? (
        <>
          {/* Mobile: Main Content Area */}
          <main className="flex-grow overflow-y-auto flex flex-col h-full">
            {renderMobileContent()}
          </main>
          {/* Mobile: Refresh Bar (now includes sheet logic) */}
          <RefreshBar />
          {/* Mobile: Bottom Tab Navigation */}
          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </>
      ) : (
        <>
          {/* Desktop: Main Content Area */}
          <main className="flex-grow overflow-y-auto flex flex-row h-full">
            <div className="flex-1 overflow-y-auto"><Home /></div>
            <div className="flex-1 overflow-y-auto max-w-[400px]"><Transactions /></div>
          </main>
          {/* Desktop: Refresh Bar (now includes sheet logic) */}
          <RefreshBar />
        </>
      )}
    </div>
  );
}

export default App;
