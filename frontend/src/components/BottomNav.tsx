import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiList } from 'react-icons/fi';

// Define tabs with paths
const tabs = [
  { name: 'Home', path: '/', icon: <FiHome size={32} /> },
  { name: 'Transactions', path: '/transactions', icon: <FiList size={32} /> }
];

function BottomNav() {
  const location = useLocation();

  return (
    <nav className="border-t border-border bg-secondary w-full bottom-0 h-20">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`flex-1 py-3 flex flex-col items-center justify-center focus:outline-none ${
                isActive ? 'accent-secondary-foreground' : 'text-muted-foreground'
              }`}
              aria-label={tab.name}
            >
              {tab.icon}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav; 