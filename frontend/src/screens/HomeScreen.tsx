import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSettings } from 'react-icons/fi';
import SpendingSummary from '../components/SpendingSummary';
import TotalBalanceCard from '../components/TotalBalanceCard';
import AccountsDisplayCard from '../components/AccountsDisplayCard';
import MonthlyCashFlowCard from '../components/MonthlyCashFlowCard';
import CustomToast from '../components/CustomToast';

function HomeScreen() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState<boolean>(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear timeout on unmount
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('google_auth_error');
    const success = urlParams.get('google_auth_success');

    let message: string | null = null;

    if (error) {
      console.error('Google Auth Error:', error);
      message = `Google Authentication failed: ${error}`;
    }
    if (success) {
      console.log('Google Auth Success!');
      message = 'Google account connected successfully!';
    }

    if (message) {
      setToastMessage(message);
      setIsToastVisible(true);
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Clear existing timeout if any
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      // Set new timeout for the toast
      toastTimeoutRef.current = setTimeout(() => {
        setIsToastVisible(false);
        setToastMessage(null);
      }, 5000);
    }
  }, []);

  return <div className='relative h-full flex flex-col overflow-hidden pb-[40px]'>
    <div className="bg-background text-foreground flex flex-col flex-grow space-y-4 p-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="flex justify-between items-center mb-2 ml-1">
        <h1 className="text-3xl font-bold">Home</h1>
        <button 
          onClick={() => navigate('/settings')}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Settings"
        >
          <FiSettings size={24} />
        </button>
      </div>

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
    
    <CustomToast message={toastMessage} isVisible={isToastVisible} />
  </div>
}

export default HomeScreen; 