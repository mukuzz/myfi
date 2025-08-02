import ReactDOM from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import { store } from './store/store';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import BottomNav from './components/BottomNav';
import { useIsMobile } from './hooks/useIsMobile';
import CashFlowDetailsScreen from './screens/CashFlowDetailsScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import HomeScreen from './screens/HomeScreen';
import SpendingSummaryScreen from './screens/SpendingSummaryScreen';
import RefreshBar from './components/RefreshBar';
import SettingsScreen from './screens/SettingsScreen';
import { NavigationProvider } from './contexts/NavigationContext';


// Keep DesktopAppHome as it's used in conditional rendering below
function DesktopAppHome() {
  return (
    // Main container allows normal page scrolling
    <main className="grid grid-cols-12 grid-rows-1 h-full">
      {/* First child is sticky to the top, occupies screen height, and allows internal scroll */}
      <div className="flex-grow h-full col-span-6 lg:col-span-8">
        <HomeScreen />
      </div>
      {/* Second child takes remaining space and scrolls with the page */}
      <div className="h-full border-dashed border-l-2 border-border col-span-6 lg:col-span-4">
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

  // Check if the current route needs the bottom nav visible
  // Note: With nested routes, pathname might include parent paths. Adjust if needed.
  // const isBottomNavNeeded = isMobile && (location.pathname === '/transactions' || location.pathname === '/');
  // const isRefreshBarNeeded = location.pathname === '/transactions' || location.pathname === '/';
  const isBottomNavNeeded = true;
  const isRefreshBarNeeded = true;

  return (
    <div className='bg-background'>
      {isMobile ?
        <BottomNav />
        :
        <div className="flex flex-col h-full">
          <div className="flex-grow overflow-hidden">
            <DesktopAppHome />
          </div>
          <div className="flex-shrink-0">
            <RefreshBar/>
          </div>
        </div>
      }
    </div>
  );
}


ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
).render(
  <Provider store={store}>
    <NavigationProvider>
      <RootLayout />
    </NavigationProvider>
  </Provider>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();
