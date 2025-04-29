import SpendingSummary from './SpendingSummary';
import TotalBalanceCard from './TotalBalanceCard';
import AccountsDisplayCard from './AccountsDisplayCard';
import { FiUser } from 'react-icons/fi';
import MonthlyCashFlowCard from './MonthlyCashFlowCard';
import RefreshBar from './RefreshBar';

function Home() {
  return <div className='relative h-full flex flex-col overflow-hidden'>
    <div className="bg-background text-foreground flex flex-col flex-grow space-y-4 p-4 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Home</h1>
        <button className="p-2 rounded-full bg-secondary">
          <FiUser size={24} />
        </button>
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
    <RefreshBar />
  </div>
}

export default Home; 