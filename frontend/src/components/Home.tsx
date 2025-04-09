import AccountsCard from './AccountsCard';
import SpendingSummary from './SpendingSummary';
import TotalBalanceCard from './TotalBalanceCard';
import { FiUser } from 'react-icons/fi';

function Home() {
  return <div className="bg-background text-foreground flex flex-col flex-grow space-y-4 p-4 ">
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
        <SpendingSummary />
      </div>

      {/* Column 2 */}
      <div className="lg:w-1/2 flex flex-col gap-4"> 
        <AccountsCard />
      </div>

    </div>
  </div>;
}

export default Home; 