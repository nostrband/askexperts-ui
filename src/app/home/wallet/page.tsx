'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDBClient } from '../../../hooks/useDBClient';
import Header from '../../../components/layout/Header';
import Footer from '../../../components/layout/Footer';

export default function DefaultWalletPage() {
  const router = useRouter();
  const { client, loading: clientLoading } = useDBClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectToDefaultWallet = async () => {
      if (!client || clientLoading) return;

      try {
        // Get the default wallet
        const defaultWallet = await client.getDefaultWallet();
        
        if (defaultWallet) {
          // Redirect to the default wallet page
          router.replace(`/home/wallet/${defaultWallet.id}`);
        } else {
          // If no default wallet exists, get all wallets
          const wallets = await client.listWallets();
          
          if (wallets.length > 0) {
            // If there are wallets, redirect to the first one
            router.replace(`/home/wallet/${wallets[0].id}`);
          } else {
            // If no wallets exist, redirect to the home page
            router.replace('/home');
            setError('No wallets found. Please create a wallet first.');
          }
        }
      } catch (err) {
        console.error('Error fetching default wallet:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to ensure the DB client is fully initialized
    const timeoutId = setTimeout(() => {
      redirectToDefaultWallet();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [client, clientLoading, router]);

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container mx-auto px-4 text-center">
          {loading && <p className="text-gray-600">Loading your wallet...</p>}
          {error && (
            <div className="text-red-500">
              <p>Error: {error}</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}