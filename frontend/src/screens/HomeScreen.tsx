import { useRef, useState, useEffect } from 'react';
import SpendingSummary from '../components/SpendingSummary';
import TotalBalanceCard from '../components/TotalBalanceCard';
import AccountsDisplayCard from '../components/AccountsDisplayCard';
import MonthlyCashFlowCard from '../components/MonthlyCashFlowCard';
import RefreshBar from '../components/RefreshBar';
import { useIsMobile } from '../hooks/useIsMobile';
import { useLocation } from 'react-router-dom';

function HomeScreen() {
  const parentRef = useRef<HTMLDivElement>(null);
  const [parentWidth, setParentWidth] = useState<number | null>(null);

  useEffect(() => {
    const parentElement = parentRef.current;
    if (!parentElement) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === parentElement && entry.target instanceof HTMLElement) {
          setParentWidth(entry.target.offsetWidth);
        }
      }
    });

    resizeObserver.observe(parentElement);
    setParentWidth(parentElement.offsetWidth);

    return () => {
      resizeObserver.unobserve(parentElement);
    };
  }, []);

  const isMobile = useIsMobile();
  const location = useLocation(); // Get location for BottomNav logic

  // Check if the current route needs the bottom nav visible
  // Note: With nested routes, pathname might include parent paths. Adjust if needed.
  const isBottomNavVisible = isMobile && (location.pathname === '/transactions' || location.pathname === '/');

  return <div ref={parentRef} className='relative h-full flex flex-col overflow-hidden pb-[40px]'>
    <div className="bg-background text-foreground flex flex-col flex-grow space-y-4 p-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="flex justify-between items-center mb-2 ml-1">
        <h1 className="text-3xl font-bold">Home</h1>
        {/* <button className="p-2 rounded-full bg-secondary">
          <FiUser size={24} />
        </button> */}
      </div>

      {/* Mobile: Single column stack (default flow + space-y on parent) */}
      {/* Desktop: Two-column staggered layout using Flexbox */}
      <div className="lg:flex lg:gap-4 space-y-4 lg:space-y-0"> {/* Base space-y for mobile, flex for lg */}

        {/* Column 1 */}
        <div className="lg:w-1/2 flex flex-col gap-4">
          <TotalBalanceCard />
          <MonthlyCashFlowCard />
          <SpendingSummary />
        </div>

        {/* Column 2 */}
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
    
    <RefreshBar 
      className={`fixed left-0 right-0 ${isBottomNavVisible ? 'bottom-[80px]' : 'bottom-0'} max-h-[40px] h-full z-10`}
      style={{ width: parentWidth ? `${parentWidth}px` : '100%' }}
    />
  </div>
}

export default HomeScreen; 