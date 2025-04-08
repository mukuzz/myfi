import AccountsCard from './AccountsCard';
import TotalBalanceCard from './TotalBalanceCard';

function Home() {
  return <div className="bg-background text-foreground flex flex-col space-y-4 p-4">
    <TotalBalanceCard />
    <AccountsCard />
  </div>;
}

export default Home; 