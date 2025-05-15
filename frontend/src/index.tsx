import ReactDOM from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import { store } from './store/store';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

import {
  RouterProvider,
  useLocation,
  Outlet,
  ScrollRestoration,
  createMemoryRouter,
} from 'react-router-dom';
import BottomNav from './components/BottomNav';
import { useIsMobile } from './hooks/useIsMobile';
import CashFlowDetailsScreen from './screens/CashFlowDetailsScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import HomeScreen from './screens/HomeScreen';
import SpendingSummaryScreen from './screens/SpendingSummaryScreen';
import RefreshBar from './components/RefreshBar';
import SettingsScreen from './screens/SettingsScreen';


// Keep DesktopAppHome as it's used in conditional rendering below
function DesktopAppHome() {
  return (
    // Main container allows normal page scrolling
    <main className="flex flex-row w-full">
      {/* First child is sticky to the top, occupies screen height, and allows internal scroll */}
      <div className="flex-grow h-screen sticky top-0 w-[calc(100%-400px)]">
        <HomeScreen />
      </div>
      {/* Second child takes remaining space and scrolls with the page */}
      <div className="w-[400px] border-l border-border">
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

// Component to conditionally render Settings or DesktopAppHome (or a new DesktopSettings view if needed)
const SettingsRouteElement = () => {
  return <SettingsScreen />;
}

// Root layout component incorporating logic from old AppContent
function RootLayout() {
  const isMobile = useIsMobile();
  const location = useLocation(); // Get location for BottomNav logic and animation key

  // Check if the current route needs the bottom nav visible
  // Note: With nested routes, pathname might include parent paths. Adjust if needed.
  const isBottomNavNeeded = isMobile && (location.pathname === '/transactions' || location.pathname === '/');
  const isRefreshBarNeeded = location.pathname === '/transactions' || location.pathname === '/';

  return (
    <Provider store={store}>
      <div className={`h-full ${isBottomNavNeeded ? 'mb-[80px]' : ''} `}>
        <ScrollRestoration />
        {/* Child routes will render here, wrapped for animation */}
        <Outlet />
        {isBottomNavNeeded && <BottomNav />}
        {isRefreshBarNeeded && <RefreshBar 
          className={`fixed left-0 right-0 ${isBottomNavNeeded ? 'bottom-[80px]' : 'bottom-0'} max-h-[40px] h-full z-10 w-full`}
        />}
      </div>
    </Provider>
  );
}

// --- Data Router Configuration ---

const router = createMemoryRouter([
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
      {
        path: "settings",
        element: <SettingsRouteElement />,
      },
    ],
  },
]);


ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
).render(
  <RouterProvider router={router} />
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();
