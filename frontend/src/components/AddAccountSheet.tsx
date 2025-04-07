import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import { createAccount } from '../services/apiService';
import { FiX } from 'react-icons/fi';

interface AddAccountViewProps {
  onAccountCreated: (newAccount: Account) => void;
  availableParentAccounts: Account[];
}

// Extract AccountType literals directly from the Account type
const accountTypes: Account['type'][] = [
  'SAVINGS',
  'CREDIT_CARD',
  'LOAN',
  'STOCKS',
  'FIXED_DEPOSIT',
  'MUTUAL_FUND',
  'CRYPTO',
];

function AddAccountView({ onAccountCreated, availableParentAccounts }: AddAccountViewProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>(accountTypes[0]);
  const [balance, setBalance] = useState(''); // Store as string for input
  const [currency, setCurrency] = useState('INR');
  const [accountNumber, setAccountNumber] = useState('');
  const [parentAccountId, setParentAccountId] = useState<string>(''); // Store as string for select value, empty means 'None'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAccountTypeLabel = (type: Account['type']) => {
    return type.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const balanceValue = parseFloat(balance);
    if (isNaN(balanceValue)) {
        setError('Please enter a valid number for the balance.');
        setIsLoading(false);
        return;
    }

    // Basic check for account number - adjust validation as needed
    if (!accountNumber.trim()) {
        setError('Please enter an account number.');
        setIsLoading(false);
        return;
    }

    const accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      type,
      balance: balanceValue,
      currency,
      accountNumber,
      isActive: true, // Default to active
      parentAccountId: parentAccountId ? parseInt(parentAccountId, 10) : null, // Convert string ID to number or null
    };

    try {
      const newAccount = await createAccount(accountData);
      // Reset form fields only on successful creation before closing
      setName('');
      setType(accountTypes[0]);
      setBalance('');
      setCurrency('INR');
      setAccountNumber('');
      setParentAccountId(''); // Reset parent account selection
      setError(null); // Clear any previous errors
      onAccountCreated(newAccount);
    } catch (err: any) {
      console.error('Failed to create account:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 pt-8 flex-grow flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-semibold">Add New Account</h2>
      </div>

      <div className="flex-grow overflow-y-auto pb-6 pr-1">
        {error && (
          <div className="bg-error/10 text-error border border-error/30 rounded-md p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">

            <div>
              <label htmlFor="accountType" className="block text-sm font-medium text-muted-foreground mb-1">
                Account Type
              </label>
              <select
                id="accountType"
                value={type}
                onChange={(e) => setType(e.target.value as Account['type'])}
                required
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary appearance-none"
              >
                {accountTypes.map((accType) => (
                  <option key={accType} value={accType}>
                    {getAccountTypeLabel(accType)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="accountName" className="block text-sm font-medium text-muted-foreground mb-1">
                Account Name
              </label>
              <input
                type="text"
                id="accountName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                placeholder="e.g., HDFC Savings"
              />
            </div>

            <div>
              <label htmlFor="balance" className="block text-sm font-medium text-muted-foreground mb-1">
                Initial Balance
              </label>
              <input
                type="number"
                id="balance"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                required
                step="0.01"
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-muted-foreground mb-1">
                Currency
              </label>
              <input
                type="text"
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                required
                maxLength={3}
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                placeholder="e.g., INR"
              />
            </div>

            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-muted-foreground mb-1">
                Account Number
              </label>
              <input
                type="text"
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                placeholder="The complete account number"
              />
            </div>

            {/* Parent Account Selection */}
            <div>
              <label htmlFor="parentAccount" className="block text-sm font-medium text-muted-foreground mb-1">
                Parent Account (Optional)
              </label>
              <select
                id="parentAccount"
                value={parentAccountId}
                onChange={(e) => setParentAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary appearance-none"
              >
                <option value="">-- None --</option>
                {availableParentAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id.toString()}>
                    {acc.name} - {acc.accountNumber}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <div className="mt-6 flex-shrink-0">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Adding Account...' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddAccountView; 