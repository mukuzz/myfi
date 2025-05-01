import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  Outlet,
  ScrollRestoration,
} from 'react-router-dom';
import BottomNav from './components/BottomNav';
import { useIsMobile } from './hooks/useIsMobile';
import CashFlowDetailsScreen from './screens/CashFlowDetailsScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import HomeScreen from './screens/HomeScreen';
import SpendingSummaryScreen from './screens/SpendingSummaryScreen';


// Keep DesktopAppHome as it's used in conditional rendering below
function DesktopAppHome() {
  return (
    <main className="flex-grow overflow-y-auto flex flex-row h-full no-scrollbar">
      <div className="flex-1 overflow-y-auto"><HomeScreen /></div>
      <div className="flex-1 overflow-y-auto max-w-[400px] border-l border-border"><TransactionsScreen /></div>
    </main>
  );
}

// --- New Components for Data Router ---

// Component to conditionally render Home or DesktopAppHome
function HomeRouteElement() {
  const isMobile = useIsMobile();
  return isMobile ? <HomeScreen /> : <DesktopAppHome />;
}

// Component to conditionally render Transactions or DesktopAppHome
function TransactionsRouteElement() {
  const isMobile = useIsMobile();
  return isMobile ? <TransactionsScreen /> : <DesktopAppHome />;
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
        element: <SpendingSummaryScreen />,
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
