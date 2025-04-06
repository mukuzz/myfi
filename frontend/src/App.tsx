import React, { useState } from 'react';
import { Tab } from './types'; // Import Tab type
import Home from './components/Home';
import Transactions from './components/Transactions';
import Accounts from './components/Accounts';
import BottomNav from './components/BottomNav';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Transactions'); // Default to Transactions

  const renderContent = () => {
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
    <div className="flex flex-col h-screen bg-black">
      {/* Main Content Area */}
      {/* Ensure content area allows scrolling if needed, and takes up remaining space */}
      <main className="flex-grow overflow-y-auto flex flex-col">
        {renderContent()}
      </main>

      {/* Bottom Tab Navigation - Use the new component */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;
