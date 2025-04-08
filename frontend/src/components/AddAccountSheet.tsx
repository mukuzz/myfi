import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import { createAccount, getSupportedAccountInfo } from '../services/apiService';

interface AddAccountViewProps {
  onAccountCreated: (newAccount: Account) => void;
  availableParentAccounts: Account[];
}

// Key prefix for local storage
const NETBANKING_STORAGE_PREFIX = 'netbanking_';

function AddAccountView({ onAccountCreated, availableParentAccounts }: AddAccountViewProps) {
  const [supportedAccounts, setSupportedAccounts] = useState<Record<string, string[]> | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type'] | ''>(''); // Start with empty type initially
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]); // State for suggested names
  const [balance, setBalance] = useState(''); // Store as string for input
  const [currency, setCurrency] = useState('INR');
  const [accountNumber, setAccountNumber] = useState('');
  const [parentAccountId, setParentAccountId] = useState<string>(''); // Store as string for select value, empty means 'None'
  const [netbankingUsername, setNetbankingUsername] = useState('');
  const [netbankingPassword, setNetbankingPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null); // Separate error state for fetching types
  const [submitError, setSubmitError] = useState<string | null>(null); // Error state for submission

  // Fetch supported account types on mount
  useEffect(() => {
    const fetchSupportedTypes = async () => {
      setFetchError(null);
      try {
        // Assume getSupportedAccountInfo is defined in apiService.ts
        // and fetches from /api/v1/accounts/supported
        // returning Promise<SupportedAccountInfo[]>
        const data = await getSupportedAccountInfo();
        setSupportedAccounts(data);
        if (data && Object.keys(data).length > 0) {
          // Optionally set the first type as default, or leave it empty
          // setType(data[0].type);
          // setName(data[0].name); // Optionally set default name too
        }
      } catch (err: any) {
        console.error('Failed to fetch supported account types:', err);
        setFetchError(err.message || 'Failed to load account types.');
      }
    };

    fetchSupportedTypes();
  }, []);

  const getAccountTypeLabel = (type: Account['type']) => {
    return type.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedType = event.target.value as Account['type'];
    setType(selectedType);
    setName(''); // Reset name when type changes
    setSuggestedNames([]); // Reset suggestions initially

    // Find the corresponding suggested names for the selected type
    if (supportedAccounts && typeof supportedAccounts === 'object') {
        const namesForType = supportedAccounts[selectedType];
        if (namesForType && namesForType.length > 0) {
            setSuggestedNames(namesForType);
            // Optionally set the first suggestion as the default name?
            // setName(namesForType[0]); // Let's keep it empty for now to force selection/input
        }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setSubmitError(null);

    if (!type) {
        setSubmitError('Please select an account type.');
        setIsLoading(false);
        return;
    }

    // Handle empty balance input as 0
    const balanceValue = balance.trim() === '' ? 0 : parseFloat(balance);
    const trimmedAccountNumber = accountNumber.trim(); // Use trimmed version consistently

    if (isNaN(balanceValue)) {
        setSubmitError('Please enter a valid number for the balance.');
        setIsLoading(false);
        return;
    }

    // Basic check for account number - adjust validation as needed
    if (!trimmedAccountNumber) {
        setSubmitError('Please enter an account number.');
        setIsLoading(false);
        return;
    }

    // Basic check for netbanking details if provided
    if ((netbankingUsername && !netbankingPassword) || (!netbankingUsername && netbankingPassword)) {
      setSubmitError('Please provide both netbanking username and password, or leave both empty.');
      setIsLoading(false);
      return;
    }

    // Save netbanking details to local storage if provided
    if (netbankingUsername && netbankingPassword && trimmedAccountNumber) {
      try {
        const storageKey = `${NETBANKING_STORAGE_PREFIX}${trimmedAccountNumber}`;
        const credentials = { username: netbankingUsername, password: netbankingPassword };
        localStorage.setItem(storageKey, JSON.stringify(credentials));
        console.log(`Netbanking credentials saved for account ${trimmedAccountNumber}`);
      } catch (storageError) {
        console.error("Failed to save netbanking credentials to local storage:", storageError);
        // Decide if this should be a user-facing error or just logged
        // setSubmitError('Failed to save netbanking credentials locally.');
        // setIsLoading(false);
        // return;
      }
    }

    // Type is now guaranteed to be set due to the check above
    const accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      type: type!, // Use non-null assertion as type is checked
      balance: balanceValue,
      currency,
      accountNumber: trimmedAccountNumber, // Send trimmed account number
      isActive: true, // Default to active
      parentAccountId: parentAccountId ? parseInt(parentAccountId, 10) : null, // Convert string ID to number or null
    };

    try {
      const newAccount = await createAccount(accountData);
      // Reset form fields only on successful creation before closing
      setName('');
      setType(''); // Reset type to initial empty state
      setBalance('');
      setCurrency('INR');
      setAccountNumber('');
      setParentAccountId(''); // Reset parent account selection
      setNetbankingUsername(''); // Reset netbanking fields
      setNetbankingPassword(''); // Reset netbanking fields
      setSubmitError(null); // Clear any previous errors
      setFetchError(null); // Also clear fetch errors if any
      onAccountCreated(newAccount);
    } catch (err: any) {
      console.error('Failed to create account:', err);
      setSubmitError(err.message || 'Failed to create account. Please try again.');
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
        {/* Display fetch error */}
        {fetchError && (
          <div className="bg-error/10 text-error border border-error/30 rounded-md p-3 mb-4 text-sm">
            {fetchError}
          </div>
        )}
        {/* Display submit error */}
        {submitError && (
           <div className="bg-error/10 text-error border border-error/30 rounded-md p-3 mb-4 text-sm">
             {submitError}
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
                onChange={handleTypeChange}
                required
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary appearance-none"
                disabled={!supportedAccounts || Object.keys(supportedAccounts).length === 0} // Disable if no types loaded
              >
                 <option value="" disabled>-- Select Type --</option> {/* Placeholder */}
                {supportedAccounts ? (
                    Object.entries(supportedAccounts).map(([accountType, providers]) => (
                        <option key={accountType} value={accountType}>
                            {getAccountTypeLabel(accountType as Account['type'])}
                        </option>
                    ))
                ) : (
                    <option value="" disabled>Loading types...</option>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="accountName" className="block text-sm font-medium text-muted-foreground mb-1">
                Account Name
              </label>
              <select
                id="accountName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!type || suggestedNames.length === 0} // Disable if no type or no names
              >
                <option value="" disabled>-- Select Name --</option>
                {suggestedNames.map((suggestion, index) => (
                  <option key={index} value={suggestion}>
                    {suggestion}
                  </option>
                ))}
              </select>
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

            {/* Netbanking Username */}
            <div>
              <label htmlFor="netbankingUsername" className="block text-sm font-medium text-muted-foreground mb-1">
                Netbanking Username (Optional)
              </label>
              <input
                type="text"
                id="netbankingUsername"
                value={netbankingUsername}
                onChange={(e) => setNetbankingUsername(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                placeholder="Your online banking username"
                autoComplete="off" // Prevent browser autofill for sensitive fields
              />
            </div>

            {/* Netbanking Password */}
            <div>
              <label htmlFor="netbankingPassword" className="block text-sm font-medium text-muted-foreground mb-1">
                Netbanking Password (Optional)
              </label>
              <input
                type="password" // Use password type
                id="netbankingPassword"
                value={netbankingPassword}
                onChange={(e) => setNetbankingPassword(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                placeholder="Your online banking password"
                autoComplete="new-password" // Hint to browser this is a new password field
              />
               <p className="text-xs text-muted-foreground mt-1">This information is stored only on your device.</p>
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
              disabled={isLoading || !supportedAccounts} // Also disable submit if types haven't loaded
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