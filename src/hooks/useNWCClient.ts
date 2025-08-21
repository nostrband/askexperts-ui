import { useState, useEffect } from 'react';
import { nwc } from "@getalby/sdk";

// Define the transaction interface based on the SDK
interface Nip47Transaction {
  type: "incoming" | "outgoing";
  state: "settled" | "pending" | "failed";
  invoice: string;
  description: string;
  description_hash: string;
  preimage: string;
  payment_hash: string;
  amount: number;
  fees_paid: number;
  settled_at: number;
  created_at: number;
  expires_at: number;
}

// Helper function to convert millisats to sats
export const millisatsToSats = (millisats: number): number => {
  return Math.floor(millisats / 1000);
};

// Helper function to convert sats to millisats
export const satsToMillisats = (sats: number): number => {
  return sats * 1000;
};

export interface UseNWCClientResult {
  client: nwc.NWCClient | null;
  loading: boolean;
  error: Error | null;
  balance: number | null; // in sats
  getBalance: () => Promise<number>; // in sats
  payInvoice: (invoice: string) => Promise<string>; // returns preimage
  makeInvoice: (amount: number, description: string) => Promise<string>; // amount in sats, returns invoice string
  listTransactions: (limit?: number) => Promise<Nip47Transaction[]>;
}

export function useNWCClient(nwcString: string | undefined): UseNWCClientResult {
  const [client, setClient] = useState<nwc.NWCClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const initClient = async () => {
      try {
        if (!nwcString) {
          throw new Error("NWC string is required");
        }

        // Create a new NWCClient instance
        const nwcClient = new nwc.NWCClient({
          nostrWalletConnectUrl: nwcString
        });

        setClient(nwcClient);

        // Get initial balance
        try {
          const balanceResponse = await nwcClient.getBalance();
          setBalance(millisatsToSats(balanceResponse.balance));
        } catch (balanceError) {
          console.error('Error fetching initial balance:', balanceError);
          // Don't set error here, just log it, as we still have a valid client
        }
      } catch (err) {
        console.error('Error initializing NWC client:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };

    if (nwcString) {
      initClient();
    } else {
      setLoading(false);
    }

    // Cleanup function
    return () => {
      if (client) {
        client.close();
      }
    };
  }, [nwcString]);

  // Function to get the current balance
  const getBalance = async (): Promise<number> => {
    if (!client) {
      console.warn("NWC client not initialized when calling getBalance");
      return 0;
    }

    try {
      const response = await client.getBalance();
      const balanceInSats = millisatsToSats(response.balance);
      setBalance(balanceInSats);
      return balanceInSats;
    } catch (err) {
      console.error('Error fetching balance:', err);
      return 0;
    }
  };

  // Function to pay an invoice
  const payInvoice = async (invoice: string): Promise<string> => {
    if (!client) {
      throw new Error("NWC client not initialized");
    }

    try {
      const response = await client.payInvoice({ invoice });
      // Refresh balance after payment
      getBalance().catch(console.error);
      return response.preimage;
    } catch (err) {
      console.error('Error paying invoice:', err);
      throw err;
    }
  };

  // Function to create an invoice
  const makeInvoice = async (amount: number, description: string): Promise<string> => {
    if (!client) {
      throw new Error("NWC client not initialized");
    }

    try {
      // Convert sats to millisats for the API
      const amountInMillisats = satsToMillisats(amount);
      const response = await client.makeInvoice({
        amount: amountInMillisats,
        description
      });
      return response.invoice;
    } catch (err) {
      console.error('Error creating invoice:', err);
      throw err;
    }
  };

  // Function to list transactions
  const listTransactions = async (limit: number = 10): Promise<Nip47Transaction[]> => {
    if (!client) {
      console.warn("NWC client not initialized when calling listTransactions");
      return [];
    }

    try {
      const response = await client.listTransactions({ limit });
      return response.transactions;
    } catch (err) {
      console.error('Error listing transactions:', err);
      return [];
    }
  };

  return {
    client,
    loading,
    error,
    balance,
    getBalance,
    payInvoice,
    makeInvoice,
    listTransactions
  };
}