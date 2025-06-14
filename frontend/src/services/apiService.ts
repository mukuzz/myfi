import { Transaction, Account, ScrapeRequest, Tag, Page, AggregatedRefreshStatusResponseType } from '../types';

// Use environment variable or default.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api/v1';

// Define the expected structure for supported account info
// Matches the interface in AddAccountSheet.tsx
interface SupportedAccountInfo {
  type: Account['type'];
  name: string;
}

// Utility to handle fetch responses
const handleResponse = async (response: Response) => {
    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMessage = errorBody.message || errorBody.error || errorMessage;
        } catch (e) {
          // Ignore if response body is not JSON or empty
        }
        throw new Error(errorMessage);
    }
    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    // Return null or handle appropriately if no JSON content (e.g., for 204 No Content)
    return null; 
};

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

/**
 * Creates a new transaction on the server.
 * @param transactionData The data for the new transaction.
 * @returns The created transaction data from the server.
 * @throws Error if the creation fails.
 */
export const createTransaction = async (transactionData: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> => {
  // Prepare the payload for the backend.

  const response = await fetch(`${API_BASE_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Send the transformed payload
    body: JSON.stringify(transactionData),
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {
      // Ignore if response body is not JSON or empty
    }
    console.error("Failed to create transaction:", errorMessage);
    throw new Error(`Failed to create transaction: ${errorMessage}`);
  }

  return response.json();
};

// Trigger scraping process for given accounts
export const triggerScraping = async (scrapeRequests: ScrapeRequest[]): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/scraping/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scrapeRequests),
  });
  // Backend returns 200 OK on successful initiation or completion with/without errors
  await handleResponse(response); 
  // No specific return value needed
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

// Fetches a paginated list of transactions
export async function fetchTransactions(page: number, size: number): Promise<Page<Transaction>> {
  const response = await fetch(`${API_BASE_URL}/transactions?page=${page}&size=${size}&sort=transactionDate,desc`);
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {}
    console.error("Failed to fetch transactions:", errorMessage);
    throw new Error(`Failed to fetch transactions: ${errorMessage}`);
  }
  return response.json();
}

// Fetches a paginated list of transactions for a specific account
export async function fetchTransactionsByAccountId(accountId: number, page: number = 0, size: number = 20): Promise<Page<Transaction>> {
  const response = await fetch(`${API_BASE_URL}/transactions/account/${accountId}?page=${page}&size=${size}&sort=transactionDate,desc`);
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {}
    console.error("Failed to fetch transactions for account:", errorMessage);
    throw new Error(`Failed to fetch transactions for account: ${errorMessage}`);
  }
  return response.json();
}

// Fetches transactions specifically for the current month
export async function fetchCurrentMonthTransactions(): Promise<Transaction[]> {
  const response = await fetch(`${API_BASE_URL}/transactions/current-month`);
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {}
    console.error("Failed to fetch current month transactions:", errorMessage);
    throw new Error(`Failed to fetch current month transactions: ${errorMessage}`);
  }
  return response.json();
}

// Fetches transactions for a specific month and year
export async function fetchTransactionsForMonth(year: number, month: number): Promise<Transaction[]> {
  // Fetch all transactions for a given month and year (without pagination)
  const response = await fetch(`${API_BASE_URL}/transactions/month?year=${year}&month=${month}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch transactions for ${year}-${month}`);
  }
  return response.json();
}

/**
 * Fetches transactions for a specific range of months.
 * @param startYear The starting year.
 * @param startMonth The starting month (1-indexed).
 * @param endYear The ending year.
 * @param endMonth The ending month (1-indexed).
 * @returns An array of transactions within the specified range.
 * @throws Error if the fetch fails.
 */
export async function fetchTransactionsForRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Promise<Transaction[]> {
  const url = `${API_BASE_URL}/transactions/range?startYear=${startYear}&startMonth=${startMonth}&endYear=${endYear}&endMonth=${endMonth}`;
  const response = await fetch(url);
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {
      // Ignore
    }
    throw new Error(`Failed to fetch transactions for range ${startYear}-${startMonth} to ${endYear}-${endMonth}: ${errorMessage}`);
  }
  return response.json();
}

// Fetches all tags
export async function fetchTags(): Promise<Tag[]> {
  const response = await fetch(`${API_BASE_URL}/tags`);
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {}
    console.error("Failed to fetch tags:", errorMessage);
    throw new Error(`Failed to fetch tags: ${errorMessage}`);
  }
  return response.json();
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

/**
 * Calls the backend endpoint to split a transaction.
 * @param parentId The ID of the transaction to split.
 * @param amount1 The amount for the new sub-transaction.
 * @param amount2 The amount the parent transaction should be updated to.
 * @returns The updated parent transaction from the server.
 * @throws Error if the split fails.
 */
export const splitTransactionApi = async (
  parentId: number,
  amount1: number,
  amount2: number
): Promise<Transaction> => {
  const response = await fetch(`${API_BASE_URL}/transactions/${parentId}/split`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount1, amount2 }), // Send the amounts in the request body
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      // Try to parse backend error message
      const errorBody = await response.json(); 
      errorMessage = errorBody.message || errorBody.error || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {
      // If body parsing fails, use the status text
      errorMessage = response.statusText || errorMessage;
    }
    console.error(`Failed to split transaction ${parentId}:`, errorMessage);
    // Throw the specific message from backend if available
    throw new Error(`Failed to split transaction: ${errorMessage}`);
  }

  return response.json(); // Return the updated parent transaction
};

/**
 * Fetches a specific transaction by ID.
 * @param id The ID of the transaction to fetch.
 * @returns The transaction data.
 * @throws Error if the fetch fails.
 */
export const fetchTransactionById = async (id: number): Promise<Transaction> => {
  const response = await fetch(`${API_BASE_URL}/transactions/${id}`);

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {
      // Ignore
    }
    console.error(`Failed to fetch transaction with ID ${id}:`, errorMessage);
    throw new Error(`Failed to fetch transaction: ${errorMessage}`);
  }

  return response.json();
};

/**
 * Deletes a transaction by its ID.
 * @param id The ID of the transaction to delete.
 * @throws Error if the delete operation fails.
 */
export const deleteTransaction = async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'DELETE',
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
        console.error(`Failed to delete transaction with ID ${id}:`, errorMessage);
        throw new Error(`Failed to delete transaction: ${errorMessage}`);
    }

    // No content expected on successful delete
};

/**
 * Deletes an account on the server.
 * @param id The ID of the account to delete.
 * @returns Promise that resolves when the deletion is successful.
 * @throws Error if the deletion fails.
 */
export const deleteAccount = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/accounts/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      // Try to parse backend error message if available
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error || JSON.stringify(errorBody) || errorMessage;
    } catch (e) {
      // Ignore if response body is not JSON or empty
    }
    console.error(`Failed to delete account with ID ${id}:`, errorMessage);
    throw new Error(`Failed to delete account: ${errorMessage}`);
  }

  // No content expected on successful DELETE, so just return void
  return;
};

/**
 * Merges a child transaction back into its parent.
 * @param childId The ID of the child transaction to merge.
 * @returns The updated parent transaction data.
 * @throws Error if the merge fails.
 */
export const mergeTransactionApi = async (
  childId: number
): Promise<Transaction> => {
  const response = await fetch(`${API_BASE_URL}/transactions/${childId}/merge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // No body needed for this request
    },
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
    console.error(`Failed to merge transaction ${childId}:`, errorMessage);
    throw new Error(`Failed to merge transaction: ${errorMessage}`);
  }

  return response.json();
};

/**
 * Fetches the overall refresh status from the backend.
 */
export const getOverallRefreshStatus = async (): Promise<AggregatedRefreshStatusResponseType> => {
    const response = await fetch(`${API_BASE_URL}/refresh/status`);
    if (!response.ok) {
        // You might want to parse the error response body if the API provides one
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch refresh status" }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};


/**
 * Triggers a full refresh of all accounts using a master key.
 * @param masterKey The master key for authorizing the refresh.
 * @throws Error if the API call fails.
 */
export const triggerFullRefresh = async (masterKey: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/refresh/trigger-full-refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', // Though body is empty, Content-Type might be expected
      'X-Master-Key': masterKey,
      'accept': '*/*',
    },
    body: '', // Empty body as per curl
  });
  await handleResponse(response); // Use existing handler
  // No specific return value needed on success
};

/**
 * Saves or updates user credentials on the server.
 * @param accountNumber The account number.
 * @param accountName The account name.
 * @param username The username for the account.
 * @param password The password for the account.
 * @param masterKey The master key for the account.
 * @throws Error if the API call fails.
 */
export const saveCredentials = async (
  accountNumber: string,
  accountName: string,
  username: string,
  password: string,
  masterKey: string
): Promise<void> => {
  // TODO: The X-Master-Key should ideally be stored in an environment variable and not hardcoded.
  // const MASTER_KEY = 'notsecure'; // Removed hardcoded key

  const response = await fetch(`${API_BASE_URL}/credentials/account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': masterKey, // Use passed masterKey
      'accept': '*/*',
    },
    body: JSON.stringify({
      accountNumber,
      accountName,
      username,
      password,
    }),
  });

  // Using handleResponse to centralize error handling and JSON parsing logic
  // If the response is not ok, handleResponse will throw an error.
  // If the response is ok but no content (e.g. 204), it will return null.
  // If the response is ok with JSON content, it will parse and return it.
  // For a POST that might return 200/201 with no body or just a success message,
  // we might not need the parsed body, but handleResponse is safe.
  await handleResponse(response); 
  // No specific return value needed if the server returns 200/201/204 on success.
};

/**
 * Fetches the Google Authentication URL from the backend.
 * @param masterKey The master key to be sent in the header.
 * @returns A promise that resolves with the URL string.
 * @throws Error if the fetch fails or the URL is not received.
 */
export const fetchGoogleAuthUrl = async (masterKey: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/auth/google/url`, {
    headers: {
      'X-Master-Key': masterKey,
    },
  });
  const data = await handleResponse(response); // Use existing handler
  if (data && data.url) {
    return data.url;
  } else {
    throw new Error('Authorization URL not received from backend.');
  }
};

export async function setCredentialKeyValue(key: string, value: string, masterKey: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/credentials/key-value`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': masterKey,
      'accept': '*/*',
    },
    body: JSON.stringify({ key, value }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to set credential with no error details from server' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  // No specific content expected on success for this endpoint based on the curl command
}

// Add other API functions here as needed (e.g., fetchTransactions, createTransaction, deleteTransaction) 