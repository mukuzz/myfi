import { useEffect, useMemo } from 'react';
import { FiMoreHorizontal } from 'react-icons/fi'; // Using generic icons
import Card from './Card';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAccounts as fetchAccountsRedux } from '../store/slices/accountsSlice';
import CurrencyDisplay from './AmountDisplay';
import TotalBalanceCardSkeleton from './skeletons/TotalBalanceCardSkeleton'; // Updated import path

// Mock data for sparkline - replace with actual data fetching/generation
const sparklineData = [5, 10, 5, 20, 8, 15];

function TotalBalanceCard() {
  const dispatch = useAppDispatch();
  const { accounts, status, error } = useAppSelector(state => state.accounts);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAccountsRedux());
    }
  }, [status, dispatch]);

  const { totalBalance, savingsBalance, creditCardBalance } = useMemo(() => {
    const parentAccounts = accounts.filter(acc => acc.parentAccountId === null || acc.parentAccountId === undefined);
    const total = parentAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Calculate total for SAVINGS accounts
    let savingsTotal = parentAccounts
      .filter(acc => acc.type === 'SAVINGS')
      .reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Calculate total for CREDIT_CARD accounts
    let creditCardTotal = parentAccounts
      .filter(acc => acc.type === 'CREDIT_CARD')
      .reduce((sum, acc) => sum + (acc.balance || 0), 0);

    if (creditCardTotal > 0) {
      savingsTotal += creditCardTotal;
      creditCardTotal = 0;
    }

    return { totalBalance: total, savingsBalance: savingsTotal, creditCardBalance: creditCardTotal };
  }, [accounts]);

  const formatCurrency = (amount: number, currency: string = 'INR', compact: boolean = false, showNegative: boolean = false) => {
    if (!showNegative) {
      amount = Math.abs(amount);
    }
    if (compact && Math.abs(amount) >= 1000) {
      return new Intl.NumberFormat('en-IN', {
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: 1,
        minimumFractionDigits: amount % 1000 !== 0 ? 1 : 0 // Show decimal only if needed
      }).format(amount);
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderSparkline = () => (
    <svg width="60" height="24" viewBox="0 0 60 24" className="text-green-500">
      <defs>
        <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'currentColor', stopOpacity: 0.4 }} />
          <stop offset="100%" style={{ stopColor: 'currentColor', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path
        d={`M 0 ${24 - (sparklineData[0] / 20) * 20} L ${sparklineData.map((d, i) => `${i * (60 / (sparklineData.length - 1))} ${24 - (d / 20) * 20}`).join(' L ')}`}
        fill="url(#sparklineGradient)"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (status === 'loading' || status === 'idle') {
    return <TotalBalanceCardSkeleton />; // Use the skeleton component
  }

  if (status === 'failed') {
    return <div className="p-4 text-center text-error">{error || 'Failed to load balance.'}</div>;
  }

  return (
    <Card>
      <div className="p-4 bg-secondary">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center text-muted-foreground font-semibold">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-2 pt-[2px] text-xs">₹</span>
            Total Balance
          </div>
          {renderSparkline()}
        </div>

        {/* Balance and Sparkline */}
        <div className="flex justify-between items-center mb-4">
          {/* Use CurrencyDisplay for total balance */}
          <CurrencyDisplay
            amount={totalBalance}
            className="text-3xl font-bold text-foreground"
            showFraction={false}
            showOnlyNegative={true}
          />
        </div>

        {/* Aggregated Balances */}
        <div className="flex flex-wrap flex-row gap-2"> {/* Adjusted gap */}
          {/* Savings Aggregate */}
          <div className="flex items-center bg-muted/80 rounded-full text-xs p-1 px-3 space-x-1">
            <span className="text-primary text-xs">BALANCE</span>
            {/* Optional label: <span className="font-medium text-foreground mr-1">Savings:</span> */}
            <span className="font-bold text-foreground">{formatCurrency(savingsBalance, 'INR', true)}</span>
          </div>
          {/* Credit Card Aggregate */}
          <div className="flex items-center bg-muted/80 rounded-full text-xs p-1 px-3 space-x-1">
            <span className="text-primary text-xs">DEBT</span>
            <span className={`font-bold`}>{formatCurrency(creditCardBalance, 'INR', true, false)}</span>
          </div>
        </div>
      </div>
      {/* Bottom corner button placeholder */}

    </Card>
  );
}

export default TotalBalanceCard;