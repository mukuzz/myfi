import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'; // Import useLocation
import Home from './components/Home';
import Transactions from './components/Transactions';
import SpendingDetails from './components/SpendingDetails'; // Import SpendingDetails
import BottomNav from './components/BottomNav';
import { useIsMobile } from './hooks/useIsMobile'; // Import the hook
import CashFlowDetailsScreen from './screens/CashFlowDetailsScreen';


function DesktopAppHome() {
  return (
    <main className="flex-grow overflow-y-auto flex flex-row h-full no-scrollbar">
      <div className="flex-1 overflow-y-auto"><Home /></div>
      <div className="flex-1 overflow-y-auto max-w-[400px] border-l border-border"><Transactions /></div>
    </main>
  );
}

// Component to handle conditional layout
function AppContent() {
  const isMobile = useIsMobile();
  const location = useLocation(); // Get location

  // Check if the current route is the details page
  const isBottomNavNeeded = location.pathname === '/transactions' || location.pathname === '/';

  return (
    <div className="flex flex-col h-screen bg-background fixed bottom-0 w-full">
      {isMobile ? (
        <>
          {/* Mobile: Main Content Area using Routes */}
          {/* Let main take full height if details page, otherwise leave space for nav/refresh */}
          <main className={`flex-grow overflow-y-auto flex flex-col ${isBottomNavNeeded ? 'h-full' : 'h-[calc(100%-theme(spacing.20))]'} `}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/spending-summary" element={<SpendingDetails />} />
              <Route path="/cash-flow" element={<CashFlowDetailsScreen />} />
            </Routes>
          </main>
          {/* Conditionally render RefreshBar and BottomNav */} 
          {isBottomNavNeeded && (
            <>
              <BottomNav />
            </>
          )}
        </>
      ) : (
          <Routes>
            <Route path="/" element={<DesktopAppHome />} />
            <Route path="/transactions" element={<DesktopAppHome />} />
            <Route path="/spending-summary" element={<SpendingDetails />} />
            <Route path="/cash-flow" element={<CashFlowDetailsScreen />} />
          </Routes>
      )}
    </div>
  );
}

// Main App component wraps content with Router
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
