import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  Outlet,
  ScrollRestoration,
} from 'react-router-dom';
import Home from './components/Home';
import Transactions from './components/Transactions';
import SpendingDetails from './components/SpendingDetails';
import BottomNav from './components/BottomNav';
import { useIsMobile } from './hooks/useIsMobile';
import CashFlowDetailsScreen from './screens/CashFlowDetailsScreen';


// Keep DesktopAppHome as it's used in conditional rendering below
function DesktopAppHome() {
  return (
    <main className="flex-grow overflow-y-auto flex flex-row h-full no-scrollbar">
      <div className="flex-1 overflow-y-auto"><Home /></div>
      <div className="flex-1 overflow-y-auto max-w-[400px] border-l border-border"><Transactions /></div>
    </main>
  );
}

// --- New Components for Data Router ---

// Component to conditionally render Home or DesktopAppHome
function HomeRouteElement() {
  const isMobile = useIsMobile();
  return isMobile ? <Home /> : <DesktopAppHome />;
}

// Component to conditionally render Transactions or DesktopAppHome
function TransactionsRouteElement() {
  const isMobile = useIsMobile();
  return isMobile ? <Transactions /> : <DesktopAppHome />;
}

// Root layout component incorporating logic from old AppContent
function RootLayout() {
  const isMobile = useIsMobile();
  const location = useLocation(); // Get location for BottomNav logic

  // Check if the current route needs the bottom nav visible
  // Note: With nested routes, pathname might include parent paths. Adjust if needed.
  const isBottomNavNeeded = isMobile && (location.pathname === '/transactions' || location.pathname === '/');

  return (
      <div className={`h-full ${isBottomNavNeeded ? 'mb-[80px]' : ''} `}>
        <ScrollRestoration />
        {/* Child routes will render here */}
        <Outlet />
      {isBottomNavNeeded && <BottomNav />}
      </div>
  );
}

// --- Data Router Configuration ---

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />, // Use RootLayout for all routes
    children: [
      {
        index: true, // Root path "/"
        element: <HomeRouteElement />,
      },
      {
        path: "transactions",
        element: <TransactionsRouteElement />,
      },
      {
        path: "spending-summary",
        element: <SpendingDetails />,
      },
      {
        path: "cash-flow",
        element: <CashFlowDetailsScreen />,
      },
    ],
  },
]);


// --- Main App Component ---

// Main App component now uses RouterProvider
function App() {
  return <RouterProvider router={router} />;
}

export default App;
