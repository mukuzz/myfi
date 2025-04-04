import React, { useState, useEffect, useMemo } from 'react';
// Import icons
import {
  FiHome, FiList, FiGrid, FiSearch, FiPlus, FiFilter,
  FiMapPin, FiCoffee, FiHome as FiHouse, FiTag, FiCreditCard // Example icons
} from 'react-icons/fi';
import { LuIndianRupee } from "react-icons/lu"; // Specific Rupee icon


type Tab = 'Home' | 'Transactions' | 'Accounts';

// Updated Transaction interface based on Java model
interface Transaction {
  id: number; // Assuming Long maps to number in JSON
  amount: number; // Assuming BigDecimal maps to number
  description: string;
  type: 'CREDIT' | 'DEBIT';
  transactionDate: string; // Dates usually come as ISO strings
  category?: string; // Optional category
  // Add other fields if needed, e.g., accountId, tagId
}

// --- Helper Functions ---

// Basic date formatter (you might want a more robust library like date-fns or moment)
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  // Format: Apr 3, 9:46PM
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) + ', ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const formatMonthYear = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // e.g., April 2025
};

// Group transactions by month/year
const groupTransactionsByMonth = (transactions: Transaction[]): Record<string, Transaction[]> => {
  return transactions.reduce((acc, tx) => {
    // Use transactionDate for grouping
    const monthYear = formatMonthYear(tx.transactionDate);
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(tx);
    // Sort transactions within the group by date, descending (most recent first)
    acc[monthYear].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
    return acc;
  }, {} as Record<string, Transaction[]>);
};

// Map category string to icon component (customize as needed)
const getCategoryIcon = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'food & drinks': return <FiCoffee className="inline mr-1" />;
    case 'bill': return <FiHouse className="inline mr-1" />;
    case 'swiggy': return <FiMapPin className="inline mr-1" />;
    // Add more categories and icons
    default: return <FiTag className="inline mr-1" />;
  }
};

// --- Tab Components ---

function Home() {
  return <div className="p-4 text-white">Welcome Home! Content goes here.</div>;
}

function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('http://localhost:8080/api/v1/transactions');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Ensure data is an array
        setTransactions(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e.message);
        setTransactions([]); // Clear transactions on error
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Group transactions when data is available
  const groupedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return {};
    return groupTransactionsByMonth(transactions);
  }, [transactions]);

  const renderTransactionItem = (tx: Transaction) => (
    <li key={tx.id} className="bg-gray-800 p-3 rounded-lg shadow">
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-300 text-sm font-medium">{tx.description}</span>
        <span className="text-gray-400 text-xs">{formatDate(tx.transactionDate)}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className={`text-lg font-semibold ${tx.type === 'DEBIT' ? 'text-red-400' : 'text-green-400'}`}>
          {tx.type === 'DEBIT' ? '-' : '+'}<LuIndianRupee className="inline h-4 w-4 relative -top-[1px]" />{tx.amount.toLocaleString('en-IN')}
        </span>
        <div className="flex items-center space-x-2">
          {tx.category && (
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full flex items-center">
              {getCategoryIcon(tx.category)}
              {tx.category}
            </span>
          )}
          {/* Placeholder for other icons like account/tag */}
          {/* <FiCreditCard className="text-gray-500" /> */}
        </div>
      </div>
    </li>
  );

  return (
    <div className="p-4 text-white flex-grow flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <div className="flex space-x-3">
          <button className="text-gray-400 hover:text-white"><FiFilter size={20} /></button>
          <button className="text-gray-400 hover:text-white"><FiPlus size={24} /></button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search transactions"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Transaction List Area - Always grouped */}
      <div className="flex-grow overflow-y-auto pr-1">
        {loading && <p className="text-center text-gray-400">Loading transactions...</p>}
        {error && <p className="text-center text-red-500">Error: {error}</p>}
        {!loading && !error && transactions.length === 0 && <p className="text-center text-gray-400">No transactions found.</p>}

        {!loading && !error && transactions.length > 0 && (
          // Always render the grouped view
          <div className="space-y-4">
            {Object.entries(groupedTransactions)
              .sort(([dateA], [dateB]) => new Date(groupedTransactions[dateB][0].transactionDate).getTime() - new Date(groupedTransactions[dateA][0].transactionDate).getTime()) // Sort groups by most recent date
              .map(([monthYear, txs]) => (
                <div key={monthYear}>
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold text-gray-300">{monthYear}</h2>
                    <span className="text-xs text-gray-500">{txs.length} transaction{txs.length !== 1 ? 's' : ''}</span>
                  </div>
                  <ul className="space-y-2">
                     {txs.map(renderTransactionItem)}
                  </ul>
                </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Accounts() {
    return <div className="p-4 text-white">Manage your accounts here. Content goes here.</div>;
}

// --- Main App Component ---

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Transactions'); // Default to Transactions

  const renderContent = () => {
    switch (activeTab) {
      case 'Home':
        return <Home />;
      case 'Transactions':
        return <Transactions />;
      case 'Accounts':
        return <Accounts />;
      default:
        return <Home />;
    }
  };

  const tabIcons: Record<Tab, React.ReactElement> = {
    Home: <FiHome size={24} />,
    Transactions: <FiList size={24} />,
    Accounts: <FiGrid size={24} />,
    // Consider the icons from the image if you want to match exactly
    // Home: <SomeIconForFirstTab />
    // Transactions: <LuIndianRupee size={24} /> // Example: Rupee Icon
    // Accounts: <FiCreditCard size={24} /> // Example: Card Icon
    // Fourth Tab: <FiCalendar size={24} /> // Example: Calendar Icon
  };

  return (
    // Apply dark theme background to the whole app
    <div className="flex flex-col h-screen bg-black">
      {/* Main Content Area */}
      {/* Ensure content area allows scrolling if needed, and takes up remaining space */}
      <main className="flex-grow overflow-y-auto flex flex-col">
        {renderContent()}
      </main>

      {/* Bottom Tab Navigation - Dark Theme */}
      {/* Use border-t to add a separator line */}
      <nav className="border-t border-gray-700 bg-gray-900 sticky bottom-0">
        <div className="flex justify-around">
          {(Object.keys(tabIcons) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 flex flex-col items-center justify-center focus:outline-none ${
                activeTab === tab ? 'text-white' : 'text-gray-500'
              } hover:text-white`}
              aria-label={tab} // Accessibility
            >
              {tabIcons[tab]} 
              {/* Optional: Add text label back if desired */}
              {/* <span className="text-xs mt-1">{tab}</span> */}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;
