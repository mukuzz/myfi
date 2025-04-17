import { useEffect, useMemo } from 'react';
import { FiMoreHorizontal, FiBriefcase } from 'react-icons/fi'; // Using generic icons
import { IconType } from 'react-icons';
import Card from './Card';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAccounts as fetchAccountsRedux } from '../store/slices/accountsSlice';

// Mock data for sparkline - replace with actual data fetching/generation
const sparklineData = [5, 10, 5, 20, 8, 15]; 

// Mock bank logos/icons - replace with actual icons or logic
interface BankInfo {
  icon: IconType | string; // Allow string for initial letter fallback
  color: string;
}

const bankLogos: Record<string, BankInfo> = {
  'ICICI': { icon: 'I', color: 'bg-orange-500' }, // Placeholder
  'HDFC': { icon: 'H', color: 'bg-blue-800' }, // Placeholder
  'OTHERS': { icon: FiBriefcase, color: 'bg-blue-500' }, // Example for others
  'STAR': { icon: '⭐', color: 'bg-yellow-500' }, // Example for the star icon
};

function TotalBalanceCard() {
  const dispatch = useAppDispatch();
  const { accounts, status, error } = useAppSelector(state => state.accounts);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAccountsRedux());
    }
  }, [status, dispatch]);

  const { totalBalance, aggregatedBalances } = useMemo(() => {
    const parentAccounts = accounts.filter(acc => acc.parentAccountId === null || acc.parentAccountId === undefined);
    const total = parentAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    
    const aggregated = parentAccounts.reduce((acc, current) => {
      const key = current.name + "|" + current.type + "|" + current.accountNumber;

      if (!acc[key]) {
        acc[key] = { balance: 0, count: 0, name: key, logoKey: current.name }; // Add logoKey here
      }
      acc[key].balance += current.balance || 0;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { balance: number; count: number; name: string; logoKey: string }>); // Added logoKey type

    // Create the array from the aggregated object
    const finalAggregatedBalances = Object.values(aggregated);

    return { totalBalance: total, aggregatedBalances: finalAggregatedBalances };
  }, [accounts]);

  const formatCurrency = (amount: number, currency: string = 'INR', compact: boolean = false) => {
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
        d={`M 0 ${24 - (sparklineData[0]/20)*20} L ${sparklineData.map((d, i) => `${i * (60 / (sparklineData.length - 1))} ${24 - (d/20)*20}`).join(' L ')}`} 
        fill="url(#sparklineGradient)" 
        stroke="currentColor" 
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const renderBankItem = (item: { name: string; balance: number; logoKey: string }) => {
    const logoInfo = bankLogos[item.logoKey] || bankLogos['OTHERS'];
    // Always format as currency, use compact format
    const displayValue = formatCurrency(item.balance, 'INR', true);

    return (
        <div key={item.name} className="flex items-center bg-muted/80 rounded-full text-sm p-1 pr-3"> {/* Added padding */}
           {typeof logoInfo.icon === 'string' ? (
               <span className={`w-5 h-5 rounded-full ${logoInfo.color} text-white flex items-center justify-center text-xs font-bold mr-2`}>
                   {logoInfo.icon}
               </span>
           ) : (
               <logoInfo.icon className={`w-5 h-5 ${logoInfo.color ? logoInfo.color.replace('bg-', 'text-') : 'text-primary'} mr-2`} />
           )}
           <span className="font-medium text-foreground">{displayValue}</span>
        </div>
    );
  }

  if (status === 'loading' || status === 'idle') {
    return <div className="p-4 text-center text-muted-foreground">Loading Total Balance...</div>;
  }

  if (status === 'failed') {
    return <div className="p-4 text-center text-error">{error || 'Failed to load balance.'}</div>;
  }

  return (
    <Card>
      <div className="p-4 bg-secondary">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center text-sm text-muted-foreground font-medium">
             <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-2 text-xs">₹</span>
             Total Balance
          </div>
          <button className="text-muted-foreground">
            <FiMoreHorizontal size={20} />
          </button>
        </div>

        {/* Balance and Sparkline */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-3xl font-bold text-foreground">
            {formatCurrency(totalBalance)}
          </span>
          {renderSparkline()}
        </div>

        {/* Aggregated Balances */}
        <div className="flex flex-wrap flex-row gap-4">
           {aggregatedBalances.map(renderBankItem)}
        </div>
      </div>
       {/* Bottom corner button placeholder */}
       
    </Card>
  );
}

export default TotalBalanceCard;