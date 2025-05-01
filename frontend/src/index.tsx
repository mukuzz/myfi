import ReactDOM from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AnimatePresence, motion } from 'framer-motion';

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
    <main className="overflow-y-auto flex flex-row h-full">
      <div className="flex-1 overflow-y-auto"><HomeScreen /></div>
      <div className="flex-1 overflow-y-auto max-w-[400px] border-l border-border"><TransactionsScreen /></div>
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
      <div className={`h-full bg-red ${isBottomNavNeeded ? 'mb-[80px]' : ''} `}>
        <ScrollRestoration />
        {/* Child routes will render here, wrapped for animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
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
