import React from 'react';
import { FiHome, FiList } from 'react-icons/fi';
import { Tab } from '../types'; // Assuming Tab type is in types.ts

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const tabIcons: Record<Tab, React.ReactElement> = {
  Home: <FiHome size={32} />,
  Transactions: <FiList size={32} />
};

function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  return (
    <nav className="border-t border-border bg-secondary w-full bottom-0 h-20">
      <div className="flex justify-around">
        {(Object.keys(tabIcons) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 flex flex-col items-center justify-center focus:outline-none ${
              activeTab === tab ? 'accent-secondary-foreground' : 'text-muted-foreground'
            }`}
            aria-label={tab} // Accessibility
          >
            {tabIcons[tab]}
            {/* Optional: Add text label back if desired */}
            {/* <span className="text-xs mt-1">{tab}</span> */}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default BottomNav; 