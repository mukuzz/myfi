import AccountsCard from './AccountsCard';
import TotalBalanceCard from './TotalBalanceCard';

function Home() {
  return <div className="bg-background text-foreground flex flex-col flex-grow space-y-4 p-4">
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-3xl font-bold">Home</h1>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="col-span-1">
        <TotalBalanceCard />
      </div>
      <div className="col-span-1">
        {/* Second grid item - can be used for future content */}
      </div>
      <div className="col-span-1">
        <AccountsCard />
      </div>
    </div>
  </div>;
}

export default Home; 