import React, { useState, useEffect } from 'react';
import { Account } from '../types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createAccount, fetchAccounts } from '../store/slices/accountsSlice';
import { fetchSupportedAccounts } from '../store/slices/supportedAccountsSlice';

interface AddAccountViewProps {
  onAccountCreated: (newAccount: Account) => void;
  availableParentAccounts: Account[];
}

function AddAccountView({ onAccountCreated, availableParentAccounts }: AddAccountViewProps) {
  const dispatch = useAppDispatch();
  // Select supported accounts state from Redux
  const { types: supportedAccounts, status: supportedAccountsStatus, error: supportedAccountsError } = useAppSelector(state => state.supportedAccounts);
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type'] | ''>('');
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [accountNumber, setAccountNumber] = useState('');
  const [parentAccountId, setParentAccountId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch supported accounts using Redux thunk on mount if not already fetched
  useEffect(() => {
    if (supportedAccountsStatus === 'idle') {
      dispatch(fetchSupportedAccounts());
    }
  }, [supportedAccountsStatus, dispatch]);

  const getAccountTypeLabel = (type: Account['type']) => {
    return type.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedType = event.target.value as Account['type'];
    setType(selectedType);
    setName('');
    setSuggestedNames([]);

    // Find the corresponding suggested names for the selected type
    if (supportedAccounts && typeof supportedAccounts === 'object') {
        const namesForType = supportedAccounts[selectedType];
        if (namesForType && namesForType.length > 0) {
            setSuggestedNames(namesForType);
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
    const trimmedAccountNumber = accountNumber.trim();

    if (isNaN(balanceValue)) {
        setSubmitError('Please enter a valid number for the balance.');
        setIsLoading(false);
        return;
    }

    if (!trimmedAccountNumber) {
        setSubmitError('Please enter an account number.');
        setIsLoading(false);
        return;
    }

    const accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      type: type!,
      balance: balanceValue,
      currency,
      accountNumber: trimmedAccountNumber,
      isActive: true,
      parentAccountId: parentAccountId ? parseInt(parentAccountId, 10) : null,
    };


    try {
      const resultAction = await dispatch(createAccount(accountData));

      if (createAccount.fulfilled.match(resultAction)) {
        const newAccount = resultAction.payload;
        setName('');
        setType('');
        setBalance('');
        setCurrency('INR');
        setAccountNumber('');
        setParentAccountId('');
        setSubmitError(null);

        dispatch(fetchAccounts());

        onAccountCreated(newAccount);
      } else {
          const errorMessage = typeof resultAction.payload === 'string' ? resultAction.payload : 'Failed to create account.';
          setSubmitError(errorMessage);
      }
    } catch (err: any) {
      console.error('Failed to create account:', err);
      setSubmitError(err.message || 'An unexpected error occurred while creating the account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-6 flex-grow flex flex-col h-full">

      <div className="flex-grow overflow-y-auto pb-6 pr-1">
        {supportedAccountsStatus === 'failed' && supportedAccountsError && (
          <div className="bg-error/10 text-error border border-error/30 rounded-md p-3 mb-4 text-sm">
            {supportedAccountsError}
          </div>
        )}
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
                disabled={supportedAccountsStatus !== 'succeeded' || !supportedAccounts || Object.keys(supportedAccounts).length === 0}
              >
                 <option value="" disabled>-- Select Type --</option>
                 {
                   supportedAccountsStatus === 'succeeded' && supportedAccounts ? (
                     Object.entries(supportedAccounts).map(([accountType, providers]) => (
                       <option key={accountType} value={accountType}>
                         {getAccountTypeLabel(accountType as Account['type'])}
                       </option>
                     ))
                   ) : supportedAccountsStatus === 'loading' ? (
                     <option value="" disabled>Loading types...</option>
                   ) : supportedAccountsStatus === 'failed' ? (
                     <option value="" disabled>Error loading types</option>
                   ) : null
                 }
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
                disabled={!type || suggestedNames.length === 0}
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
              disabled={isLoading || supportedAccountsStatus !== 'succeeded'}
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