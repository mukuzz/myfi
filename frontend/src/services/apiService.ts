import { Transaction, Account, ScrapeRequest, Tag } from '../types';

// Use environment variable or default.
// NOTE: For Vite projects, prefer `import.meta.env.VITE_API_URL`.
// If using that causes a type error, ensure "vite/client" is in your tsconfig types.
const API_BASE_URL = process.env.API_BASE_URL || 'http://192.168.1.5:8080/api/v1';

// Define the expected structure for supported account info
// Matches the interface in AddAccountSheet.tsx
interface SupportedAccountInfo {
  type: Account['type'];
  name: string;
}

/**
 * Updates a transaction on the server.
 * @param id The ID of the transaction to update.
 * @param transactionData The partial transaction data to update (e.g., { notes: "New note" }).
 * @returns The updated transaction data from the server.
 * @throws Error if the update fails.
 */
export const updateTransaction = async (
  id: number,
  transactionData: Partial<Omit<Transaction, 'id'>> // Allow updating subset of fields, except id
): Promise<Transaction> => {
  const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transactionData),
  });

  if (!response.ok) {
    // Attempt to read error message from response body
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {
      // Ignore if response body is not JSON or empty
    }
    console.error("Failed to update transaction:", errorMessage);
    throw new Error(`Failed to update transaction: ${errorMessage}`);
  }

  return response.json();
};

/**
 * Fetches all accounts from the server.
 * @returns An array of account objects.
 * @throws Error if the fetch fails.
 */
export const fetchAccounts = async (): Promise<Account[]> => {
  const response = await fetch(`${API_BASE_URL}/accounts`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {
      // Ignore if response body is not JSON or empty
    }
    console.error("Failed to fetch accounts:", errorMessage);
    throw new Error(`Failed to fetch accounts: ${errorMessage}`);
  }

  return response.json();
};

/**
 * Fetches a specific account by ID.
 * @param id The ID of the account to fetch.
 * @returns The account data.
 * @throws Error if the fetch fails.
 */
export const fetchAccountById = async (id: number): Promise<Account> => {
  const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {
      // Ignore if response body is not JSON or empty
    }
    console.error(`Failed to fetch account with ID ${id}:`, errorMessage);
    throw new Error(`Failed to fetch account: ${errorMessage}`);
  }

  return response.json();
};

/**
 * Creates a new account on the server.
 * @param accountData The data for the new account.
 * @returns The created account data from the server.
 * @throws Error if the creation fails.
 */
export const createAccount = async (accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> => {
  const response = await fetch(`${API_BASE_URL}/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(accountData),
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {
      // Ignore if response body is not JSON or empty
    }
    console.error("Failed to create account:", errorMessage);
    throw new Error(`Failed to create account: ${errorMessage}`);
  }

  return response.json();
};

// Trigger scraping process for given accounts
export const triggerScraping = async (scrapeRequests: ScrapeRequest[]): Promise<void> => {
  // We expect a 202 Accepted or similar, no specific body needed for now
  const response = await fetch(`${API_BASE_URL}/scraping/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scrapeRequests),
  });

  if (!response.ok) {
     // Attempt to read error message from response body
     let errorMessage = `HTTP error! status: ${response.status}`;
     try {
       const errorBody = await response.json();
       errorMessage = errorBody.message || errorBody.error || errorMessage;
     } catch (e) {
       // Ignore if response body is not JSON or empty
     }
     throw new Error(errorMessage);
   }

   // No specific return value needed if the backend just acknowledges the request
   return;
};

// Fetch the last scrape time
export const getLastScrapeTime = async (): Promise<number | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/status/last-scrape-time`);
    if (!response.ok) {
        if (response.status === 404) {
            // Handle case where no time has been recorded yet
            return null; 
        }
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    // Expecting the timestamp directly as a string in the body, or empty if null
    const timeString = await response.text(); 
    return timeString ? parseInt(timeString) : null;
  } catch (error) {
    console.error('Failed to fetch last scrape time:', error);
    // Depending on requirements, you might want to re-throw or return null
    return null; 
  }
};

/**
 * Fetches the supported account types and their suggested names.
 * @returns An array of objects, each containing an account type and name.
 * @throws Error if the fetch fails.
 */
export const getSupportedAccountInfo = async (): Promise<Record<string, string[]>> => {
    const response = await fetch(`${API_BASE_URL}/accounts/supported`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.message || JSON.stringify(errorBody) || errorMessage;
      } catch (e) {
        // Ignore if response body is not JSON or empty
      }
      console.error("Failed to fetch supported account info:", errorMessage);
      throw new Error(`Failed to fetch supported account info: ${errorMessage}`);
    }

    // API returns an object like:
    // {"CRYPTO":[],"LOAN":[],"MUTUAL_FUND":[],"SAVINGS":["HDFC","ICICI"],"FIXED_DEPOSIT":[],"STOCKS":[],"CREDIT_CARD":["HDFC","ICICI"]}
    return response.json();
};

export async function fetchTransactionsAndTags(): Promise<{ transactions: Transaction[], tags: Tag[] }> {
  const [transactionsResponse, tagsResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/transactions`),
    fetch(`${API_BASE_URL}/tags`)
  ]);

  if (!transactionsResponse.ok) {
    throw new Error(`HTTP error fetching transactions! status: ${transactionsResponse.status}`);
  }
  if (!tagsResponse.ok) {
    throw new Error(`HTTP error fetching tags! status: ${tagsResponse.status}`);
  }

  const transactionsData = await transactionsResponse.json();
  const tagsData = await tagsResponse.json();

  const transactions = Array.isArray(transactionsData) ? transactionsData : [];
  const tags = Array.isArray(tagsData) ? tagsData : [];

  return { transactions, tags };
}

export async function updateTransactionTagApi(
  transactionId: number,
  transactionData: Omit<Transaction, 'id' | 'tagId'>, // Send other transaction fields
  newTagId: number | null
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...transactionData,
      tagId: newTagId // Only update the tagId field
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Server error response:", errorBody);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  console.log("Transaction tag updated successfully via API");
}

// Add other API functions here as needed (e.g., fetchTransactions, createTransaction, deleteTransaction) 