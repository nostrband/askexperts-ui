'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useDBClient } from '../../hooks/useDBClient';
import { DBWallet } from 'askexperts/db';
import Dialog from '../../components/ui/Dialog';

export default function HomePage() {
  const { client, loading: clientLoading, error: clientError } = useDBClient();
  const [wallets, setWallets] = useState<DBWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Add wallet dialog state
  const [addWalletDialogOpen, setAddWalletDialogOpen] = useState(false);
  const [nwcString, setNwcString] = useState('');
  const [walletName, setWalletName] = useState('');
  const [addingWallet, setAddingWallet] = useState(false);
  const [addWalletError, setAddWalletError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWallets = async () => {
      if (!client || clientLoading) return;

      try {
        const walletsData = await client.listWallets();
        setWallets(walletsData);
        
        // If there's a default wallet, get it
        const defaultWallet = walletsData.find(wallet => wallet.default);
        
        // If there's only one wallet, make it the default
        if (walletsData.length === 1 && !defaultWallet) {
          await client.updateWallet({
            ...walletsData[0],
            default: true
          });
          setWallets([{ ...walletsData[0], default: true }]);
        }
      } catch (err) {
        console.error('Error fetching wallets:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchWallets();
  }, [client, clientLoading]);

  const handleAddWallet = async () => {
    if (!client) return;
    if (!nwcString.trim()) {
      setAddWalletError('NWC string is required');
      return;
    }

    try {
      setAddingWallet(true);
      setAddWalletError(null);
      
      // Generate a wallet name if not provided
      const name = walletName.trim() || `Wallet ${wallets.length + 1}`;
      
      // Create a new wallet with the provided NWC string
      const walletId = await client.insertWallet({
        name,
        nwc: nwcString.trim(),
        default: wallets.length === 0, // Make it default if it's the first wallet
        user_id: await client.getUserId()
      });

      // Close the dialog and reset form
      setAddWalletDialogOpen(false);
      setNwcString('');
      setWalletName('');
      
      // Redirect to the new wallet page
      router.push(`/home/wallet/${walletId}`);
    } catch (err) {
      console.error('Error adding wallet:', err);
      setAddWalletError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setAddingWallet(false);
    }
  };

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Welcome to AskExperts.io</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Wallets</h2>
              <button
                onClick={() => setAddWalletDialogOpen(true)}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Wallet
              </button>
            </div>
            
            {(loading || clientLoading) && (
              <div className="text-gray-600">Loading your wallets...</div>
            )}
            
            {(error || clientError) && (
              <div className="text-red-500">
                <p>Error loading wallets:</p>
                <p>{error || (clientError instanceof Error ? clientError.message : 'Unknown error')}</p>
              </div>
            )}
            
            {!loading && !error && wallets.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">You don't have any wallets yet.</p>
                <button
                  onClick={() => setAddWalletDialogOpen(true)}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add Your First Wallet
                </button>
              </div>
            )}
            
            {!loading && !error && wallets.length > 0 && (
              <div className="space-y-4">
                {wallets.map((wallet) => (
                  <Link
                    key={wallet.id}
                    href={`/home/wallet/${wallet.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900">{wallet.name}</h3>
                        {wallet.default && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Add Wallet Dialog */}
      <Dialog
        isOpen={addWalletDialogOpen}
        onClose={() => {
          setAddWalletDialogOpen(false);
          setNwcString('');
          setWalletName('');
          setAddWalletError(null);
        }}
        title="Add Wallet"
        footer={
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setAddWalletDialogOpen(false);
                setNwcString('');
                setWalletName('');
                setAddWalletError(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddWallet}
              disabled={!nwcString.trim() || addingWallet}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                !nwcString.trim() || addingWallet
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {addingWallet ? 'Adding...' : 'Add Wallet'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="walletName" className="block text-sm font-medium text-gray-700 mb-1">
              Wallet Name (optional)
            </label>
            <input
              type="text"
              id="walletName"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              placeholder="Enter a name for your wallet"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="nwcString" className="block text-sm font-medium text-gray-700 mb-1">
              NWC String
            </label>
            <textarea
              id="nwcString"
              value={nwcString}
              onChange={(e) => setNwcString(e.target.value)}
              placeholder="Enter your Nostr Wallet Connect string"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
            <p className="mt-1 text-xs text-gray-500">
              You can get this from your Lightning wallet that supports NWC.
            </p>
          </div>
          
          {addWalletError && (
            <div className="p-2 bg-red-100 text-red-800 rounded-md">
              {addWalletError}
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}