import { useState, useEffect } from 'react';
import { useDBClient } from './useDBClient';
import { useNWCClient, millisatsToSats } from './useNWCClient';

export function useDefaultWalletBalance() {
  const { client: dbClient, loading: dbLoading } = useDBClient();
  const [defaultWallet, setDefaultWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Initialize NWC client with the default wallet's NWC string
  const {
    balance,
    loading: nwcLoading,
    error: nwcError
  } = useNWCClient(defaultWallet?.nwc);

  // Fetch the default wallet
  useEffect(() => {
    const fetchDefaultWallet = async () => {
      if (!dbClient || dbLoading) return;

      try {
        setLoading(true);
        const wallet = await dbClient.getDefaultWallet();
        
        // Only update state if we got a valid wallet with an NWC string
        if (wallet && wallet.nwc) {
          setDefaultWallet(wallet);
        } else {
          console.log('No default wallet found or wallet missing NWC string');
        }
      } catch (err) {
        console.error('Error fetching default wallet:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to ensure the DB client is fully initialized
    const timeoutId = setTimeout(() => {
      fetchDefaultWallet();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [dbClient, dbLoading]);

  return {
    wallet: defaultWallet,
    balance,
    loading: loading || nwcLoading,
    error: error || nwcError
  };
}