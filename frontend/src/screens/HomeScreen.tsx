import { useState, useEffect, useRef } from 'react';
import SpendingSummary from '../components/SpendingSummary';
import TotalBalanceCard from '../components/TotalBalanceCard';
import AccountsDisplayCard from '../components/AccountsDisplayCard';
import MonthlyCashFlowCard from '../components/MonthlyCashFlowCard';
import { FiMail } from 'react-icons/fi';
import { fetchGoogleAuthUrl } from '../services/apiService';

function HomeScreen() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);

  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear timeouts on unmount
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);


  useEffect(() => {
    // Check for query params from Google Auth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('google_auth_error');
    const success = urlParams.get('google_auth_success');

    if (error) {
      console.error('Google Auth Error:', error);
      const errorMessage = `Google Authentication failed: ${error}`;
      setAuthError(errorMessage);
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Clear existing timeout if any
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      // Set new timeout
      errorTimeoutRef.current = setTimeout(() => {
        setAuthError(null);
      }, 5000);
    }
    if (success) {
      console.log('Google Auth Success!');
      setAuthSuccess(true);
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Clear existing timeout if any
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
       // Set new timeout
      successTimeoutRef.current = setTimeout(() => {
        setAuthSuccess(false);
      }, 5000);
    }
  }, []);


  const handleConnectGmail = async () => {
    setAuthError(null); // Clear previous errors explicitly on new attempt
    setAuthSuccess(false);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current); // Clear pending error timeouts
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current); // Clear pending success timeouts

    try {
      const authUrl = await fetchGoogleAuthUrl();
      // Redirect the user to the Google authorization page
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate Google Auth:', error);
      const errorMessage = `Failed to start Google Authentication. Please check backend connection. Error: ${error instanceof Error ? error.message : String(error)}`;
      setAuthError(errorMessage);

       // Clear existing timeout if any
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      // Set new timeout
      errorTimeoutRef.current = setTimeout(() => {
          setAuthError(null);
      }, 5000);
    }
  };

  return <div className='relative h-full flex flex-col overflow-hidden pb-[40px]'>
    <div className="bg-background text-foreground flex flex-col flex-grow space-y-4 p-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="flex justify-between items-center mb-2 ml-1">
        <h1 className="text-3xl font-bold">Home</h1>
        <button 
          onClick={handleConnectGmail}
          className="flex items-center gap-2 px-3 py-1.5 text-primary text-sm border border-border rounded-md hover:bg-muted transition-colors"
        >
          <FiMail size={18} />
          Connect Gmail
        </button>
      </div>

      {authError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Auth Error:</strong>
        <span className="block sm:inline"> {authError}</span>
      </div>}
      {authSuccess && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Success:</strong>
        <span className="block sm:inline"> Google account connected successfully! (Refresh token obtained by backend).</span>
      </div>}

      <div className="lg:flex lg:gap-4 space-y-4 lg:space-y-0">

        <div className="lg:w-1/2 flex flex-col gap-4">
          <TotalBalanceCard />
          <MonthlyCashFlowCard />
          <SpendingSummary />
        </div>

        <div className="lg:w-1/2 flex flex-col gap-4">
          <AccountsDisplayCard
            title="Bank Accounts"
            accountTypes={['SAVINGS']}
            emptyStateMessage="No savings accounts found"
          />
          <AccountsDisplayCard
            title="Credit Cards"
            accountTypes={['CREDIT_CARD']}
            emptyStateMessage="No credit cards found"
          />
        </div>

      </div>
    </div>
    
    
  </div>
}

export default HomeScreen; 