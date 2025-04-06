import { Transaction } from '../types';

const API_BASE_URL = process.env.API_BASE_URL || 'http://192.168.1.5:8080/api/v1'; // Use environment variable or default

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

// Add other API functions here as needed (e.g., fetchTransactions, createTransaction, deleteTransaction) 