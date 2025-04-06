import React from 'react';
import { FiHome, FiList, FiCreditCard } from 'react-icons/fi';
import { Tab } from '../types'; // Assuming Tab type is in types.ts

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const tabIcons: Record<Tab, React.ReactElement> = {
  Home: <FiHome size={24} />,
  Transactions: <FiList size={24} />,
  Accounts: <FiCreditCard size={24} />,
  // Consider the icons from the image if you want to match exactly
  // Home: <SomeIconForFirstTab />
  // Transactions: <LuIndianRupee size={24} /> // Example: Rupee Icon
  // Accounts: <FiCreditCard size={24} /> // Example: Card Icon
  // Fourth Tab: <FiCalendar size={24} /> // Example: Calendar Icon
};

function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  return (
    <nav className="border-t border-border bg-background sticky bottom-0 pb-4">
      <div className="flex justify-around">
        {(Object.keys(tabIcons) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 flex flex-col items-center justify-center focus:outline-none ${
              activeTab === tab ? 'text-primary' : 'text-muted-foreground'
            } hover:text-primary`}
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