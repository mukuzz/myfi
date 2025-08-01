import { useState } from 'react';
import HomeScreen from '../screens/HomeScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import RefreshBar from './RefreshBar';
import { BsViewList } from 'react-icons/bs';
import { LuHome } from 'react-icons/lu';

const tabs = [
  { name: 'Home', path: '/', icon: <LuHome size={32} />, screen: <HomeScreen /> },
  { name: 'Transactions', path: '/transactions', icon: <BsViewList size={32} />, screen: <TransactionsScreen /> }
];

function BottomNav() {
  const [activeTabName, setActiveTabName] = useState(tabs[0].name);

  const activeScreen = tabs.find(tab => tab.name === activeTabName)?.screen || <HomeScreen />;

  return (
    <nav className="w-full h-screen flex flex-col fixed bottom-0 disable-scroll">
      <div className="flex-grow bg-background overflow-hidden">
        {activeScreen}
      </div>
      {/* <div className="flex-shrink-0">
        <RefreshBar className="disable-scroll"/>
      </div> */}
      <div className="flex flex-shrink-0 border-t border-border justify-around pb-6">
        {tabs.map((tab) => {
          const isActive = tab.name === activeTabName;
          return (
            <button
              key={tab.name}
              onClick={(e) => {
                e.preventDefault();
                if (!isActive) {
                  setActiveTabName(tab.name);
                } else {
                  // scroll to top
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className={`flex-1 py-3 flex flex-col items-center justify-center focus:outline-none ${
                isActive ? 'accent-secondary-foreground' : 'text-muted-foreground'
              }`}
              aria-label={tab.name}
            >
              {tab.icon}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav; 