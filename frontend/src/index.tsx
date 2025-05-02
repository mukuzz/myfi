import ReactDOM from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import { store } from './store/store';

import {
  RouterProvider,
  useLocation,
  Outlet,
  ScrollRestoration,
  createBrowserRouter,
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
    // Main container allows normal page scrolling
    <main className="flex flex-row">
      {/* First child is sticky to the top, occupies screen height, and allows internal scroll */}
      <div className="flex-1 h-screen sticky top-0 overflow-y-auto">
        <HomeScreen />
      </div>
      {/* Second child takes remaining space and scrolls with the page */}
      <div className="flex-1 max-w-[400px] border-l border-border">
        <TransactionsScreen />
      </div>
    </main>
  );
}

// --- New Components for Data Router ---

// Component to conditionally render Home or DesktopAppHome
const HomeRouteElement = () => {
  const isMobile = useIsMobile();
  return isMobile ? <HomeScreen /> : <DesktopAppHome />;
}

// Component to conditionally render Transactions or DesktopAppHome
const TransactionsRouteElement = () => {
  const isMobile = useIsMobile();
  return isMobile ? <TransactionsScreen /> : <DesktopAppHome />;
}

// Root layout component incorporating logic from old AppContent
function RootLayout() {
  const isMobile = useIsMobile();
  const location = useLocation(); // Get location for BottomNav logic and animation key

  // Check if the current route needs the bottom nav visible
  // Note: With nested routes, pathname might include parent paths. Adjust if needed.
  const isBottomNavNeeded = isMobile && (location.pathname === '/transactions' || location.pathname === '/');

  return (
    <Provider store={store}>
      <div className={`h-full ${isBottomNavNeeded ? 'mb-[80px]' : ''} `}>
        <ScrollRestoration />
        {/* Child routes will render here, wrapped for animation */}
        <Outlet />
        {isBottomNavNeeded && <BottomNav />}
      </div>
    </Provider>
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
        index: true,
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


ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
).render(
  <RouterProvider router={router} />
);
