import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import { fetchAccounts } from '../services/apiService';
import { 
  FiCreditCard, FiDollarSign, FiTrendingUp, FiLock, FiAward, 
  FiDatabase, FiHash, FiAlertTriangle, FiRefreshCw, 
  FiChevronLeft, FiChevronRight, FiPlus
} from 'react-icons/fi';

function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAccounts();
        setAccounts(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError('Failed to load accounts. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAccounts();
  }, []);

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'SAVINGS':
        return <FiDollarSign className="h-5 w-5" />;
      case 'CREDIT_CARD':
        return <FiCreditCard className="h-5 w-5" />;
      case 'LOAN':
        return <FiAlertTriangle className="h-5 w-5" />;
      case 'STOCKS':
        return <FiTrendingUp className="h-5 w-5" />;
      case 'FIXED_DEPOSIT':
        return <FiLock className="h-5 w-5" />;
      case 'MUTUAL_FUND':
        return <FiAward className="h-5 w-5" />;
      case 'CRYPTO':
        return <FiHash className="h-5 w-5" />;
      default:
        return <FiDatabase className="h-5 w-5" />;
    }
  };

  const getAccountTypeLabel = (type: Account['type']) => {
    return type.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Mocked bank logo component - you would need actual logos in production
  const getBankLogo = (bankName: string) => {
    // For demonstration, we're using a styled div with "F" for Federal Bank
    return (
      <div className="w-10 h-10 flex items-center justify-center text-primary">
        <div className="bg-secondary p-1 rounded">
          {bankName.charAt(0)}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <FiRefreshCw className="animate-spin h-8 w-8 mb-4 text-primary" />
        <p>Loading accounts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <FiAlertTriangle className="h-8 w-8 mb-4 text-error" />
        <p className="text-error font-medium">{error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background p-4 border-b border-border flex items-center justify-between">
        <h1 className="text-3xl font-bold">Accounts</h1>
        <button className="text-primary text-2xl">
          <FiPlus />
        </button>
      </header>

      {/* Account Cards */}
      <div className="p-4">
        {accounts.map(account => (
          <div 
            key={account.id} 
            className="mb-4 bg-background rounded-2xl overflow-hidden shadow border border-border"
          >
            <div className="p-4">
              <div className="flex justify-between items-center">
                {getBankLogo(account.name)}
                <FiChevronRight className="text-muted-foreground text-xl" />
              </div>
              
              <div className="flex justify-between items-center mt-6">
                <h2 className="text-xl font-bold  text-foreground">
                    {account.name}
                </h2>
                <p className="text-foreground text-sm bg-secondary px-2 py-1 rounded-full">
                  {getAccountTypeLabel(account.type)}
                </p>
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <p className="text-muted-foreground text-sm uppercase">
                  Account Number
                </p>
                <p className="text-foreground text-sm">{account.accountNumber}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {accounts.length === 0 && (
        <div className="text-center py-8">
          <FiCreditCard className="h-12 w-12 mb-4 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No accounts found</p>
        </div>
      )}
    </div>
  );
}

export default Accounts; 